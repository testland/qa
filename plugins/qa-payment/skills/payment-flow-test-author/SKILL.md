---
name: payment-flow-test-author
description: "Build-an-X workflow that authors the full payment-flow test suite in three phases: the refund matrix (full / partial / multiple-partials / over-refund / already-refunded, per-gateway APIs for Stripe, Adyen, PayPal, Braintree), the chargeback / dispute suite (Visa + Mastercard reason codes, evidence submission windows, won / lost / accepted dispositions), and webhook replay + recovery via gateway-native simulators (Stripe CLI trigger / resend, Adyen Customer Area resend, PayPal Webhook Simulator, Braintree sampleNotification). Driven by the state model in payment-flow-states-reference. Use when building refund, dispute, or payment-webhook-robustness coverage for a payment integration; for generic (non-payment) webhook receiver testing use webhook-delivery-tester in the qa-notifications plugin."
---

# payment-flow-test-author

## Overview

The three highest-incident payment surfaces after the happy path - refunds,
disputes, and webhook handling - are one suite-authoring job, because they
share the same substrate: the gateway's async state machine. This workflow
builds all three phases in dependency order, driven by the canonical states
in `payment-flow-states-reference`.

Common bugs each phase catches: double-refund and
partial-refund-not-summing (Phase 1); missed evidence deadlines and
unreconciled chargeback fees (Phase 2); non-idempotent redelivery handling
and spoofable handlers (Phase 3).

## When to use

- New payment integration; need refund / dispute / webhook coverage.
- A refund- or webhook-related incident; need to backfill tests.
- Gateway migration; need to re-validate flow logic.

## Phase 0 - Map the state machine

Before writing any test, translate the canonical lifecycle
(created → requires_action → processing → succeeded → refunded / disputed)
into your gateway's vocabulary using `payment-flow-states-reference`. Every
assertion below is on a state from that grid, and every async assertion
waits on the webhook, never the synchronous API return.

## Phase 1 - The refund matrix

### Inventory refund touchpoints

```bash
grep -rn 'refund\|Refund\|REFUND' --include='*.{ts,js,py,java,go,rb,cs}' .
```

Categorise per gateway + per code path (order cancellation, CS portal,
subscription downgrade, dispute-lost automation).

### The 7 canonical refund cases

For each (gateway, touchpoint):

| # | Test | Expected |
|---|---|---|
| 1 | Full refund of captured charge | refund.status = succeeded; charge.amount_refunded = charge.amount |
| 2 | Partial refund (50%) | refund.amount = 0.5x charge.amount |
| 3 | Multiple partials summing to full | Cumulative refunded = charge.amount; charge.refunded = true |
| 4 | Over-refund attempt (101%) | Gateway rejects; descriptive error |
| 5 | Refund of already-fully-refunded charge | Rejected with "charge_already_refunded" or equivalent |
| 6 | Refund of failed charge | Rejected; no refund created |
| 7 | Refund of disputed charge | Per gateway policy: blocks or allows without reversing the dispute |

### Per-gateway refund APIs

Stripe, per [docs.stripe.com/refunds](https://docs.stripe.com/refunds):

```typescript
test('over-refund rejected', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  await expect(
    stripe.refunds.create({ payment_intent: intent.id, amount: 1500 })
  ).rejects.toThrow(/refund_amount_exceeds_charge_amount/);
});
```

Adyen refunds are async, per
[docs.adyen.com/online-payments/refund](https://docs.adyen.com/online-payments/refund):
the call returns `[refund-received]`; completion arrives as a `[REFUND]`
notification - assert via webhook, not the sync response. PayPal uses
`CapturesRefundRequest` per
[developer.paypal.com/docs/api/payments/v2#captures_refund](https://developer.paypal.com/docs/api/payments/v2/#captures_refund);
Braintree requires settlement first (`gateway.testing.settle`, sandbox-only)
before `gateway.transaction.refund`.

### Refund idempotency

```typescript
test('idempotent refund', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  const key = 'refund-' + intent.id;
  const r1 = await stripe.refunds.create({ payment_intent: intent.id, amount: 500 }, { idempotencyKey: key });
  const r2 = await stripe.refunds.create({ payment_intent: intent.id, amount: 500 }, { idempotencyKey: key });
  expect(r1.id).toBe(r2.id);
});
```

Without idempotency, network retries double-refund the customer.

## Phase 2 - The chargeback / dispute suite

1. Pick the 3-5 reason codes most common for your business from
   [references/reason-codes.md](references/reason-codes.md) - each code has
   different evidence requirements.
2. Trigger a disputable charge in the gateway's test mode (Stripe
   `pm_card_createDispute` per
   [docs.stripe.com/testing#disputes](https://docs.stripe.com/testing#disputes);
   an Adyen `[CHARGEBACK]` notification per
   [docs.adyen.com/risk-management/disputes-api](https://docs.adyen.com/risk-management/disputes-api);
   a PayPal sandbox dispute per
   [developer.paypal.com/docs/api/customer-disputes/v1](https://developer.paypal.com/docs/api/customer-disputes/v1/)).
3. Assert the dispute lands in `needs_response` (or the gateway equivalent)
   with the expected reason.
4. Submit evidence before `evidence_details.due_by` and assert
   `has_evidence` is set, per
   [docs.stripe.com/disputes/responding](https://docs.stripe.com/disputes/responding).
5. Drive each disposition - won (winning evidence), lost (no response),
   accepted - and confirm the final state via the `charge.dispute.closed`
   webhook.
6. Verify the ledger reverses funds plus the chargeback fee on a lost
   dispute.

```typescript
test('lost dispute reverses funds in ledger', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  const dispute = await triggerLostDispute(intent);
  await waitForChargebackEvent();

  const ledger = await getLedgerEntries(intent.id);
  expect(ledger).toContainEqual(expect.objectContaining({ type: 'chargeback', amount: -1000 }));
  expect(ledger).toContainEqual(expect.objectContaining({ type: 'chargeback_fee' }));
});
```

## Phase 3 - Webhook replay via gateway-native simulators

Payment webhooks are the source of truth for async transitions, so every
handler must be signature-verified, idempotent, order-tolerant, and
replay-safe.

1. Confirm the handler reads the **raw request body** - signature
   verification fails on parsed-then-restringified bytes.
2. Run the four-case signature gauntlet (unsigned / wrong-secret / valid /
   expired-timestamp) for your gateway; the per-gateway signature schemes,
   simulator commands, and the full gauntlet code are in
   [references/replay-simulators.md](references/replay-simulators.md).
3. Add the idempotency dedup test - redelivery must not double-process:

```typescript
test('redelivered webhook handled idempotently', async () => {
  const payload = makeWebhookPayload({ type: 'payment_intent.succeeded' });
  const sig = signPayload(payload);

  await postWebhook(payload, sig);
  await postWebhook(payload, sig);  // redelivery

  const rows = await db.payment_records.count({ event_id: payload.id });
  expect(rows).toBe(1);             // processed exactly once
});
```

4. Wire the gateway's replay simulator and drive a real event end to end:

```bash
stripe trigger payment_intent.succeeded    # synthetic event to the forward URL
stripe events resend evt_test_12345        # replay a captured event (30-day window)
```

5. Add the harder recovery scenarios - out-of-order delivery, mid-handler
   crash, archive replay, per-gateway suite layout - from
   [references/advanced-recovery-scenarios.md](references/advanced-recovery-scenarios.md).

For generic webhook **receiver** testing (Standard-Webhooks signature
scheme, non-payment senders, inbound replay hardening), use
`webhook-delivery-tester` in the qa-notifications plugin; this phase covers
the payment-gateway-specific surface only.

## Emit the coverage matrix

```yaml
# tests/payment/flow-matrix.yaml
matrix:
  gateways: [stripe, adyen, paypal, braintree]
  refund_variants: [full, partial, multiple-partials, over-refund, already-refunded, failed-charge, disputed-charge]
  dispute_cells: ["Visa 10.4", "Visa 13.1", "Mastercard 4855"] # x [won, lost, accepted]
  webhook_cases: [signature-gauntlet, idempotent-redelivery, out-of-order, crash-recovery]
```

Report the matrix per release and document deliberate gaps.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only full-refund happy path | Partial-refund accounting bugs hide | Per-variant test |
| No idempotency key on mutating calls | Network retry → double refund / charge | Always set |
| Skip dispute tests | Worst-case impact is high | Cover top 3-5 reason codes |
| No due-date tracking | Evidence submitted late → auto-lose | Test the due-date watcher |
| Skip chargeback-fee reconciliation | Books don't match | Test the ledger |
| Skip signature verification | Spoofed webhook payloads | Four-case gauntlet per gateway |
| Trust HTTP 200 == processed | Server may have crashed mid-handler | Atomic commit + event-ID record |
| Sync assertions on async flows | Adyen / PayPal finalize via webhook | Webhook-driven asserts per Phase 0 |
| Test against live APIs | Real money | Sandbox-only, per `payment-gateway-sandboxes` |

## Limitations

- **Real chargebacks take weeks.** Test mode collapses the timeline;
  production verification needs production traffic.
- **Reason codes change.** Visa / Mastercard publish updates; test data goes
  stale annually.
- **Bank-declined refunds simulate poorly**; rely on platform-documented
  test cases.
- **Bank-initiated webhooks** aren't always test-mode-triggerable.

## References

- Stripe refunds: [docs.stripe.com/refunds](https://docs.stripe.com/refunds);
  disputes: [docs.stripe.com/disputes](https://docs.stripe.com/disputes).
- Adyen refunds:
  [docs.adyen.com/online-payments/refund](https://docs.adyen.com/online-payments/refund);
  disputes: [docs.adyen.com/risk-management/disputes-api](https://docs.adyen.com/risk-management/disputes-api).
- PayPal Captures.refund:
  [developer.paypal.com/docs/api/payments/v2/#captures_refund](https://developer.paypal.com/docs/api/payments/v2/#captures_refund);
  Customer Disputes:
  [developer.paypal.com/docs/api/customer-disputes/v1/](https://developer.paypal.com/docs/api/customer-disputes/v1/).
- Reason codes (Visa / Mastercard tables):
  [references/reason-codes.md](references/reason-codes.md).
- Replay simulators + signature gauntlet:
  [references/replay-simulators.md](references/replay-simulators.md).
- Advanced recovery scenarios:
  [references/advanced-recovery-scenarios.md](references/advanced-recovery-scenarios.md).
- State model: `payment-flow-states-reference`.
- Sandboxes: `payment-gateway-sandboxes`, `stripe-test-cards-and-webhooks`.
- Generic webhook receiver testing: `webhook-delivery-tester` (qa-notifications).
