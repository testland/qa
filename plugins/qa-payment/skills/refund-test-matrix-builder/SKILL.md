---
name: refund-test-matrix-builder
description: "Workflow-driven skill that builds a refund test matrix from a payment flow inventory. Covers the refund variants (full / partial / multiple-partials / overrefund-attempt / refund-on-disputed / refund-on-already-refunded / refund-on-failed-charge), the per-gateway nuances (Stripe RefundIntent; Adyen Modifications refund; PayPal Captures.refund; Braintree Transaction.refund), the timing variants (immediate / next-day / declined-by-bank), and emits the test cases per cell. Use when designing refund coverage for a new integration. Composes payment-flow-states-reference + stripe-test-cards-and-webhooks + adyen-test-mode + paypal-sandbox + braintree-test-cards."
rating: 22
d6: 4
archetype: S3
---

# refund-test-matrix-builder

## Overview

Refund logic is the second-most-misimplemented part of payment
flows (after 3DS). Common bugs: double-refund, refund-before-
capture, partial-refund-not-summing, refund-of-already-refunded.

This skill walks through producing the refund test matrix - 
not exhaustive (every gateway × every variant × every
timing = thousands), but covering the canonical cells.

## When to use

- New payment integration; need refund test coverage.
- Refund-related incident; need to backfill tests.
- Gateway migration; need to re-validate refund logic.

## Step 1 - Inventory refund touchpoints

Grep for refund-issuing code:

```bash
grep -rn 'refund\|Refund\|REFUND' --include='*.{ts,js,py,java,go,rb,cs}' .
```

Categorise per gateway + per code path:

| Touchpoint | Gateway | Trigger |
|---|---|---|
| Order cancellation flow | Stripe | User clicks "cancel" within 24h |
| Customer service portal | Stripe | CS rep issues partial refund |
| Subscription downgrade | Stripe | Pro-rated refund for unused time |
| Cross-tenant chargeback handler | Stripe / Adyen | Automatic on dispute lost |

## Step 2 - The 7 canonical refund test cases

For each (gateway, touchpoint):

| # | Test | Expected |
|---|---|---|
| 1 | Full refund of captured charge | refund.status = succeeded; charge.amount_refunded = charge.amount |
| 2 | Partial refund (50%) | refund.amount = 0.5x charge.amount; charge.amount_refunded reflects |
| 3 | Multiple partial refunds summing to full | All succeed; cumulative refunded = charge.amount; charge.refunded = true |
| 4 | Over-refund attempt (101% of total) | Gateway rejects; descriptive error |
| 5 | Refund of already-fully-refunded charge | Rejected with "charge_already_refunded" or equivalent |
| 6 | Refund of failed charge | Rejected; no refund created |
| 7 | Refund of disputed charge | Per gateway: blocks or allows but doesn't reverse dispute |

## Step 3 - Per-gateway refund patterns

### Stripe

Per [docs.stripe.com/refunds](https://docs.stripe.com/refunds):

```typescript
test('full refund', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  const refund = await stripe.refunds.create({ payment_intent: intent.id });
  expect(refund.status).toBe('succeeded');
  expect(refund.amount).toBe(1000);
});

test('partial refund', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  const refund = await stripe.refunds.create({ payment_intent: intent.id, amount: 500 });
  expect(refund.amount).toBe(500);
});

test('over-refund rejected', async () => {
  const intent = await createSucceededIntent({ amount: 1000 });
  await expect(
    stripe.refunds.create({ payment_intent: intent.id, amount: 1500 })
  ).rejects.toThrow(/refund_amount_exceeds_charge_amount/);
});
```

### Adyen

Per [docs.adyen.com/online-payments/refund](https://docs.adyen.com/online-payments/refund):

```typescript
const result = await checkout.modificationsCorrespondingRefund({
  originalReference: 'capture-pspReference',
  modificationAmount: { value: 500, currency: 'EUR' },
});
expect(result.response).toBe('[refund-received]');
// Actual refund completion via webhook (notification)
```

Adyen refunds are async; webhook handles `[refund-received]` →
`[REFUND]` settled.

### PayPal

Per [developer.paypal.com/docs/api/payments/v2#captures_refund](https://developer.paypal.com/docs/api/payments/v2/#captures_refund):

```typescript
const request = new paypal.payments.CapturesRefundRequest(captureId);
request.requestBody({ amount: { value: '5.00', currency_code: 'USD' } });
const result = await client.execute(request);
expect(result.result.status).toBe('COMPLETED');
```

### Braintree

```typescript
const result = await gateway.transaction.refund(transactionId, '5.00');
expect(result.success).toBe(true);
expect(result.transaction.type).toBe('credit');
```

Braintree requires settlement first per
[`braintree-test-cards`](../braintree-test-cards/SKILL.md).

## Step 4 - Timing variants

| Variant | Test |
|---|---|
| Immediate refund | Issue + assert refund.status = succeeded |
| Async refund (Adyen, PayPal) | Issue + poll webhook |
| Same-day (within auth window) | Issue before settlement; assert auth-void semantics |
| Next-day | Issue after settlement; assert refund-credit semantics |
| Declined by bank | Per gateway: simulated via specific failure-mode test card |

## Step 5 - Emit the test matrix

```yaml
# tests/payment/refund-matrix.yaml
matrix:
  gateways:
    - stripe
    - adyen
    - paypal
    - braintree
  variants:
    - full
    - partial
    - multiple-partials
    - over-refund-attempt
    - already-refunded
    - failed-charge
    - disputed-charge
  timing:
    - immediate
    - async-webhook
```

For each (gateway, variant, timing) cell, generate a test:

```typescript
// tests/payment/refund-stripe.test.ts
import { CASES } from './refund-matrix';

describe.each(CASES.stripe)('Stripe refund: $variant', ({ variant, expected }) => {
  test(variant, async () => {
    // ... per-variant logic + assertion
  });
});
```

## Step 6 - Idempotency

Refunds are mutating operations; idempotency keys are critical:

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

## Step 7 - Reporting + reconciliation

Refund-test coverage matrix should be reported per release:

```markdown
## Refund Coverage Matrix

| Gateway | Variant | Immediate | Async Webhook |
|---|---|---|---|
| Stripe | full | ✅ | n/a (sync) |
| Stripe | partial | ✅ | n/a |
| Stripe | over-refund | ✅ | n/a |
| Adyen | full | ✅ | ✅ |
| ... | ... | ... | ... |

## Documented gaps

- Braintree disputed-charge refund: deferred to phase 2
- Multi-partial refund crossing day boundaries: manual QA
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only full-refund happy path | Partial-refund accounting bugs hide | Per-variant test |
| Skip over-refund test | Sum-mismatch on partials | Always test |
| No idempotency key | Network retry → double refund | Always set |
| Test refunds against live API | Real money | Sandbox-only |
| Skip async webhook for Adyen | Refund status undetermined | Wait for [REFUND] notification |
| Hardcoded refund amounts | Cents vs dollars confusion | Per-currency tests |
| Test in one currency only | Cross-currency refund quirks | Test in EUR, GBP, JPY |
| Skip cross-tenant refund tests | Per [`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md), tenant A can't refund tenant B's charge | Cross-tenant probe |

## Limitations

- **Refund-of-disputed-charge** is gateway-policy-specific.
  Some allow with warnings; some block.
- **Currency conversion at refund time** may differ from charge
  time. Test with currency-changing scenarios.
- **Bank-declined refunds** simulate poorly; rely on platform-
  doc'd test cases.
- **No automation for actual money movement.** Sandbox refunds
  don't move real funds; production verification is separate.

## References

- Stripe refunds:
  [docs.stripe.com/refunds](https://docs.stripe.com/refunds).
- Adyen refunds:
  [docs.adyen.com/online-payments/refund](https://docs.adyen.com/online-payments/refund).
- PayPal Captures.refund:
  [developer.paypal.com/docs/api/payments/v2/#captures_refund](https://developer.paypal.com/docs/api/payments/v2/#captures_refund).
- Braintree refunds:
  [developer.paypal.com/braintree/docs/guides/transactions/refund-void-discard](https://developer.paypal.com/braintree/docs/guides/transactions/refund-void-discard).
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Per-platform SDKs:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
- Sibling builders:
  [`chargeback-flow-test-author`](../chargeback-flow-test-author/SKILL.md),
  [`payment-webhook-replay-skill`](../payment-webhook-replay-skill/SKILL.md).
