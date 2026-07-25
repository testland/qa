---
name: payment-webhook-replay
description: "Workflow-driven skill that builds payment webhook replay + recovery tests. Covers the idempotency contract (every webhook handler must handle redelivery without side effects), the replay simulators (Stripe CLI `stripe trigger`, Adyen Customer Area resend, PayPal Webhook Simulator, Braintree webhook test), the signature-verification gauntlet (HMAC-SHA256 per gateway, expired-timestamps rejection), and the partial-failure recovery scenarios. Use when designing webhook robustness tests."
---

# payment-webhook-replay

## Overview

Payment webhooks are the **source of truth** for asynchronous state
transitions (settlement, refund completion, dispute state). Every webhook
handler must be:

1. **Signature-verified** - reject spoofed payloads.
2. **Idempotent** - redelivery doesn't double-charge.
3. **Order-tolerant** - out-of-order delivery is normal.
4. **Replay-safe** - months-old replay doesn't break.

This skill produces the test suite for these properties.

## When to use

- New webhook handler for any payment gateway.
- After a webhook-related incident (missed events, double processing).
- Migrating between gateways or webhook formats.

## How to use

1. Confirm the handler reads the **raw request body**, not a parsed-then-restringified copy - signature verification fails on the restringified bytes otherwise.
2. Write the signature-verification gauntlet for the gateway (Step 1): reject unsigned, reject wrong-secret, accept valid, reject expired-timestamp.
3. Add the idempotency dedup test plus the event-ID handler (Step 2).
4. Wire a replay simulator for the gateway (Step 3), then run the **Worked example** end to end against staging.
5. Add the harder recovery scenarios - out-of-order delivery, mid-handler crash, archive replay, per-gateway suite layout - from [references/advanced-recovery-scenarios.md](references/advanced-recovery-scenarios.md).

## Step 1 - Signature-verification gauntlet

Per [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures),
the Stripe gauntlet is four cases - unsigned, wrong-secret, valid, and
expired-timestamp:

```typescript
const payload = JSON.stringify({ type: 'payment_intent.succeeded' });

test('rejects unsigned payload', async () => {
  const res = await fetch('/webhooks/stripe', { method: 'POST', body: payload });
  expect(res.status).toBe(401);  // No Stripe-Signature header
});

test('rejects wrong-secret signature', async () => {
  const wrongSig = stripe.webhooks.generateTestHeaderString({ payload, secret: 'wrong-secret' });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST', body: payload, headers: { 'stripe-signature': wrongSig },
  });
  expect(res.status).toBe(401);
});

test('accepts valid signature', async () => {
  const sig = stripe.webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST', body: payload, headers: { 'stripe-signature': sig },
  });
  expect(res.status).toBe(200);
});

test('rejects expired timestamp', async () => {
  const oldSig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
    timestamp: Math.floor(Date.now()/1000) - 3600,  // 1 hour ago
  });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST', body: payload, headers: { 'stripe-signature': oldSig },
  });
  expect(res.status).toBe(401);
});
```

The signature scheme differs per gateway; run the same four-case gauntlet
against each:

| Gateway | Signature scheme | Reference |
|---|---|---|
| Stripe | HMAC-SHA256 over the payload; the signature carries a timestamp, so old timestamps reject | [webhooks/signatures](https://docs.stripe.com/webhooks/signatures) |
| Adyen | HMAC-SHA256 over the canonical string; validated per-event, not per-request | [verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures) |
| PayPal | SHA256-with-RSA; verify via the PayPal verification endpoint or SDK helper | [webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/) |
| Braintree | parser validates `bt_signature` against the merchant's public key | Braintree webhook parser |

## Step 2 - Idempotency

Redelivery must not double-process. Dedup on the gateway-issued event ID:

```typescript
test('redelivered webhook handled idempotently', async () => {
  const payload = makeWebhookPayload({ type: 'payment_intent.succeeded' });
  const sig = signPayload(payload);

  const before = await db.payment_records.count();
  await postWebhook(payload, sig);
  const after1 = await db.payment_records.count();
  await postWebhook(payload, sig);  // Redelivery
  const after2 = await db.payment_records.count();

  expect(after1 - before).toBe(1);
  expect(after2).toBe(after1);
});
```

The handler looks up by event ID and acks duplicates without re-doing the work:

```typescript
async function handleEvent(event) {
  const existing = await db.events.findOne({ event_id: event.id });
  if (existing) {
    return 200;  // Already handled; safe to ack
  }
  await processEvent(event);
  await db.events.create({ event_id: event.id, processed_at: new Date() });
  return 200;
}
```

## Step 3 - Replay simulators

Each gateway ships a way to (re)send a real event at the handler:

| Gateway | Replay | Notes |
|---|---|---|
| Stripe | `stripe trigger payment_intent.succeeded`; `stripe events resend evt_test_12345` | CLI ([stripe-cli](https://docs.stripe.com/stripe-cli)) |
| Adyen | Customer Area transaction "Resend webhook" | Re-sends with the original signature - useful for idempotency tests |
| PayPal | Dashboard simulator; REST equivalent via the API | [simulate-event](https://developer.paypal.com/api/rest/webhooks/event-names/) |
| Braintree | `gateway.webhookTesting.sampleNotification(kind, id)` | Generates a test signature for any event kind ([parse/node](https://developer.paypal.com/braintree/docs/guides/webhooks/parse/node)) |

## Worked example

Replay one gateway's event (Stripe) end to end and assert both core
properties - the signature is accepted and a redelivery is idempotent.

Drive a real event at the handler with the CLI:

```bash
stripe trigger payment_intent.succeeded    # synthetic event to the forward URL
stripe events resend evt_test_12345        # replay a captured event (30-day window)
```

Then assert the guarantees in-process:

```typescript
test('replayed Stripe event: signature accepted, idempotent on resend', async () => {
  const payload = makeWebhookPayload({ type: 'payment_intent.succeeded' });
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(payload),
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });

  const first = await postWebhook(payload, sig);
  expect(first.status).toBe(200);                   // valid signature accepted

  const resend = await postWebhook(payload, sig);   // same event redelivered
  expect(resend.status).toBe(200);

  const rows = await db.payment_records.count({ event_id: payload.id });
  expect(rows).toBe(1);                             // processed exactly once
});
```

That is the minimum end-to-end proof for one gateway: a real replayed event
passes signature verification and processes exactly once. Extend it to
out-of-order, crash-recovery, and archive-replay scenarios in
[references/advanced-recovery-scenarios.md](references/advanced-recovery-scenarios.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip signature verification | Spoofed webhook payloads | Always verify |
| Skip idempotency | Replay double-processes | Event-ID dedup table |
| Trust HTTP 200 == processed | Server may have crashed | Atomic commit + event-ID record |
| Hardcoded webhook secrets in tests | Leaked via test snapshots | Env vars |
| No "future-dated" webhook test | Clock skew + redelivery | Test +5min and -5min |
| Single-platform tests only | Per-gateway quirks | Per-gateway test directory |
| `body-parser` ate the raw bytes | Signature verification fails on parsed-then-restringified | Raw-body middleware |
| No partial-failure / retry test | Crash mid-handler corrupts state | Atomic transaction with event-ID |

## Limitations

- **Replay simulator availability varies.** Stripe CLI is most
  developer-friendly; others require dashboard or API.
- **Real production replay is slower** than test mode; SLA windows differ.
- **Bank-initiated webhooks (chargebacks)** aren't always
  test-mode-triggerable.
- **Signature algorithms differ per gateway.** Stripe HMAC-SHA256 with
  timestamp; Adyen HMAC-SHA256 with canonical string; PayPal SHA256-with-RSA.

## References

- Stripe webhook signatures:
  [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures).
- Stripe events resend:
  [docs.stripe.com/cli/events/resend](https://docs.stripe.com/cli/events/resend).
- Adyen HMAC validation:
  [docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures).
- PayPal webhook signature:
  [developer.paypal.com/api/rest/webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/).
- Braintree webhook testing:
  [developer.paypal.com/braintree/docs/guides/webhooks/testing-go-live](https://developer.paypal.com/braintree/docs/guides/webhooks/testing-go-live).
- Advanced recovery scenarios (order-tolerance, partial-failure, archive-replay, suite layout):
  [references/advanced-recovery-scenarios.md](references/advanced-recovery-scenarios.md).
- Companion catalog:
  `payment-flow-states-reference`.
- Per-platform SDKs:
  `stripe-test-cards-and-webhooks`,
  `adyen-test-mode`,
  `paypal-sandbox`,
  `braintree-test-cards`.
- Sibling builders:
  `refund-test-matrix-builder`,
  `chargeback-flow-test-author`.
