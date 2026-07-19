---
name: payment-webhook-replay
description: "Workflow-driven skill that builds payment webhook replay + recovery tests. Covers the idempotency contract (every webhook handler must handle redelivery without side effects), the replay simulators (Stripe CLI `stripe trigger`, Adyen Customer Area resend, PayPal Webhook Simulator, Braintree webhook test), the signature-verification gauntlet (HMAC-SHA256 per gateway, expired-timestamps rejection), and the partial-failure recovery scenarios. Use when designing webhook robustness tests."
---

# payment-webhook-replay

## Overview

Payment webhooks are the **source of truth** for asynchronous
state transitions (settlement, refund completion, dispute
state). Every webhook handler must be:

1. **Signature-verified** - reject spoofed payloads.
2. **Idempotent** - redelivery doesn't double-charge.
3. **Order-tolerant** - out-of-order delivery is normal.
4. **Replay-safe** - months-old replay doesn't break.

This skill walks through producing the test suite for these
properties.

## When to use

- New webhook handler for any payment gateway.
- After a webhook-related incident (missed events, double
  processing).
- Migrating between gateways or webhook formats.

## Step 1 - Signature verification tests

### Stripe

Per [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures):

```typescript
test('rejects unsigned payload', async () => {
  const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST',
    body: payload,
    // No Stripe-Signature header
  });
  expect(res.status).toBe(401);
});

test('rejects wrong-secret signature', async () => {
  const payload = JSON.stringify({...});
  const wrongSig = stripe.webhooks.generateTestHeaderString({
    payload, secret: 'wrong-secret',
  });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': wrongSig },
  });
  expect(res.status).toBe(401);
});

test('accepts valid signature', async () => {
  const sig = stripe.webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': sig },
  });
  expect(res.status).toBe(200);
});

test('rejects expired timestamp', async () => {
  // Stripe signatures include a timestamp; old timestamps reject
  const oldSig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
    timestamp: Math.floor(Date.now()/1000) - 3600,  // 1 hour ago
  });
  const res = await fetch('/webhooks/stripe', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': oldSig },
  });
  expect(res.status).toBe(401);
});
```

### Adyen

Per [docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures):
HMAC-SHA256 over the canonical string. Validation is per-event,
not per-request.

### PayPal

Per [developer.paypal.com/api/rest/webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/):
verify via PayPal verification endpoint or SDK helper.

### Braintree

Webhook parser validates `bt_signature` against the merchant's
public key.

## Step 2 - Idempotency tests

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

The handler should:

- Look up by event ID (gateway-issued, unique).
- If already processed, return 200 without re-doing the work.

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

## Step 3 - Order-tolerance tests

Webhooks can arrive out of order:

```typescript
test('out-of-order event delivery handled', async () => {
  const completedEvent = makeEvent({ type: 'payment_intent.succeeded' });
  const creatingEvent = makeEvent({ type: 'payment_intent.created' });

  // Deliver completed BEFORE created
  await postWebhook(completedEvent);
  await postWebhook(creatingEvent);

  // Final state should still be correct
  const record = await db.payments.findOne({ intent_id: completedEvent.data.id });
  expect(record.status).toBe('succeeded');
});
```

The handler must use **versioned events** or **state-machine
gates** to handle this:

```python
# Don't blindly overwrite state
def handle_event(event):
    record = db.payments.get(event.intent_id)
    new_state = event.data.status
    if state_transition_allowed(record.status, new_state):
        record.status = new_state
        record.save()
    # else: stale event, ignore
```

## Step 4 - Replay simulators

### Stripe CLI

```bash
stripe trigger payment_intent.succeeded
# Sends a synthetic event to the configured forward URL
```

Per [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli):
the CLI also captures and replays from the event-log:

```bash
stripe events resend evt_test_12345
```

### Adyen Customer Area

In the Adyen Customer Area, navigate to a transaction →
"Resend webhook." This re-sends with the original signature
(useful for testing idempotency).

### PayPal Webhook Simulator

Per [developer.paypal.com/api/rest/webhooks/simulate-event](https://developer.paypal.com/api/rest/webhooks/event-names/):
the dashboard exposes a simulator. CLI equivalent available
via the REST API.

### Braintree

Per [developer.paypal.com/braintree/docs/guides/webhooks/parse/node](https://developer.paypal.com/braintree/docs/guides/webhooks/parse/node):
use `gateway.webhookTesting.sampleNotification(kind, id)` to
generate a test signature for any event kind.

## Step 5 - Partial-failure scenarios

What happens when the handler crashes mid-processing?

```typescript
test('crash mid-processing → retry succeeds', async () => {
  let crashOnce = true;
  const handler = makeHandler({
    onProcessEvent: () => {
      if (crashOnce) {
        crashOnce = false;
        throw new Error('simulated crash');
      }
    },
  });

  await expect(handler.process(event)).rejects.toThrow();  // First attempt crashes
  await handler.process(event);  // Retry succeeds; idempotent

  const record = await db.payments.findOne({ event_id: event.id });
  expect(record).toBeTruthy();
});
```

Handlers should commit state changes atomically - either the
processing succeeds and the event is marked handled, or both
roll back.

## Step 6 - Replay-from-archive

Production sometimes loses webhooks (network outage, deploy
issue). Per gateway docs, all support some form of replay:

| Gateway | Replay window | Method |
|---|---|---|
| Stripe | 30 days | `stripe events resend <event_id>` |
| Adyen | Unlimited (Customer Area) | Manual or `notification-resend` API |
| PayPal | 30 days | Webhook resend endpoint |
| Braintree | Unlimited (Control Panel) | Manual or `webhookTesting.sampleNotification` |

Test:

```typescript
test('handler accepts replay from 7-day-old event', async () => {
  const oldEvent = makeEvent({ created: Math.floor(Date.now()/1000) - 7*86400 });
  const result = await handler.process(oldEvent);
  expect(result).toBe(200);
});
```

## Step 7 - Emit the test suite

```
tests/payment/webhooks/
  stripe/
    signature.test.ts
    idempotency.test.ts
    order-tolerance.test.ts
    replay.test.ts
  adyen/
    ... (same structure)
  paypal/
    ...
  braintree/
    ...
  fixtures/
    payloads/
```

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
- **Real production replay is slower** than test mode; SLA
  windows differ.
- **Bank-initiated webhooks (chargebacks)** aren't always
  test-mode-triggerable.
- **Signature algorithms differ per gateway.** Stripe HMAC-SHA256
  with timestamp; Adyen HMAC-SHA256 with canonical string;
  PayPal SHA256-with-RSA.

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
- Companion catalog:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md).
- Per-platform SDKs:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
- Sibling builders:
  [`refund-test-matrix-builder`](../refund-test-matrix-builder/SKILL.md),
  [`chargeback-flow-test-author`](../chargeback-flow-test-author/SKILL.md).
