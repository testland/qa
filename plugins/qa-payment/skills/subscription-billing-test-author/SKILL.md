---
name: subscription-billing-test-author
description: "Builds test suites for Stripe recurring-billing flows: trial-to-paid conversion, proration on plan upgrade and downgrade, dunning on failed renewal, cancel and reactivation, and the full subscription webhook event matrix (invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, invoice.paid). Uses Stripe Billing test clocks (POST /v1/test_helpers/test_clocks) to time-travel through billing cycles without calendar delay. Distinct from stripe-test-cards-and-webhooks (one-time PaymentIntents) and payment-webhook-replay (idempotency + replay robustness). Does not cover single-event CLI replay or handler idempotency testing (see payment-webhook-replay for those). Use when authoring tests for subscription or recurring-billing integrations."
metadata:
  keywords: "stripe, billing, subscriptions, recurring, test-clocks, dunning, proration, trial"
---

# subscription-billing-test-author

## Overview

Subscription billing is distinct from one-time payments. A customer's card is
charged on a schedule, trials expire, plans change mid-cycle, and payments
fail weeks after signup. Per
[docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing),
Stripe's sandbox is feature-complete for billing objects: subscriptions,
invoices, trials, and retry schedules all work against test data.

The key tool for deterministic subscription testing is the **Stripe Billing
test clock**, which lets you fast-forward a frozen simulation through days,
weeks, or months without waiting. Per
[docs.stripe.com/api/test_clocks](https://docs.stripe.com/api/test_clocks),
a test clock is created at a `frozen_time` and advanced with
`POST /v1/test_helpers/test_clocks/{id}/advance`, triggering all billing
events that would have fired in the elapsed interval.

This skill walks through five recurring-billing scenarios end to end.

## Lifecycle states to test

Per
[docs.stripe.com/billing/subscriptions/overview](https://docs.stripe.com/billing/subscriptions/overview),
subscriptions move through:

| State | Meaning |
|---|---|
| `trialing` | Trial active; no payment collected yet |
| `active` | Good standing; payment collected |
| `past_due` | Latest invoice unpaid; smart retries running |
| `unpaid` | Retries exhausted; access decision pending |
| `canceled` | Terminal; billing stopped |
| `paused` | Trial ended without payment method attached |

Each transition fires one or more webhook events. Tests must assert both the
subscription status and the correct event sequence.

## Step 1 - Create a test clock

Per
[docs.stripe.com/api/test_clocks](https://docs.stripe.com/api/test_clocks),
create a test clock frozen at a known epoch before creating any billing objects:

```typescript
const clock = await stripe.testHelpers.testClocks.create({
  frozen_time: Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000),
  name: 'billing-suite-run',
});
```

Attach the customer to the clock at creation time:

```typescript
const customer = await stripe.customers.create({
  email: 'tester@example.com',
  test_clock: clock.id,
  payment_method: 'pm_card_visa',  // 4242 4242 4242 4242
  invoice_settings: { default_payment_method: 'pm_card_visa' },
});
```

Advance time with:

```typescript
await stripe.testHelpers.testClocks.advance(clock.id, {
  advances_to: Math.floor(new Date('2025-01-08T00:00:00Z').getTime() / 1000),
});
// Poll until clock.status === 'ready' before asserting
```

Always poll `GET /v1/test_helpers/test_clocks/{id}` until `status` is `ready`
before asserting subscription state; events are asynchronous.

## Step 2 - Trial-to-paid conversion

Per
[docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing),
the recommended flow:

```typescript
// Freeze clock at Jan 1
const sub = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: PRICE_ID }],
  trial_end: Math.floor(new Date('2025-01-08T00:00:00Z').getTime() / 1000),
});
expect(sub.status).toBe('trialing');

// Advance to Day 5 - trial_will_end fires 3 days before trial ends
await stripe.testHelpers.testClocks.advance(clock.id, {
  advances_to: toEpoch('2025-01-05'),
});
await waitForClockReady(clock.id);
// Assert: customer.subscription.trial_will_end webhook fired

// Advance past trial end (Day 8)
await stripe.testHelpers.testClocks.advance(clock.id, {
  advances_to: toEpoch('2025-01-09'),
});
await waitForClockReady(clock.id);

const updated = await stripe.subscriptions.retrieve(sub.id);
expect(updated.status).toBe('active');
```

Webhook events to assert per
[docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing):

| Clock position | Event |
|---|---|
| Day 5 | `customer.subscription.trial_will_end` |
| Day 8 | `invoice.created`, `invoice.finalized`, `invoice.paid` |
| Day 8 | `customer.subscription.updated` (status: trialing -> active) |

## Step 3 - Proration on upgrade/downgrade

Per
[docs.stripe.com/billing/subscriptions/prorations](https://docs.stripe.com/billing/subscriptions/prorations),
a mid-cycle plan change generates a credit for unused time on the old price
and a charge for remaining time on the new price. Preview before applying:

```typescript
const prorationDate = Math.floor(Date.now() / 1000);

// Preview the upcoming invoice to verify proration amounts
const preview = await stripe.invoices.createPreview({
  customer: customer.id,
  subscription: sub.id,
  subscription_details: {
    items: [{ id: sub.items.data[0].id, price: NEW_PRICE_ID }],
    proration_date: prorationDate,
  },
});

// Verify credit (negative) and debit (positive) line items exist
const credit = preview.lines.data.find(l => l.amount < 0);
const debit  = preview.lines.data.find(l => l.amount > 0);
expect(credit).toBeTruthy();
expect(debit).toBeTruthy();

// Apply at the same proration_date to lock the amounts
await stripe.subscriptions.update(sub.id, {
  items: [{ id: sub.items.data[0].id, price: NEW_PRICE_ID }],
  proration_date: prorationDate,
  proration_behavior: 'create_prorations',  // default
});
```

Per
[docs.stripe.com/billing/subscriptions/prorations](https://docs.stripe.com/billing/subscriptions/prorations),
`proration_behavior` options are:

| Value | Effect |
|---|---|
| `create_prorations` | Creates proration items; billed on next invoice (default) |
| `always_invoice` | Creates proration items AND immediately invoices |
| `none` | No proration; full new price on next cycle |

Downgrade test: pass a lower-priced plan as `NEW_PRICE_ID` and assert the
credit line item is larger than the debit line item.

## Step 4 - Dunning on failed renewal

Per
[docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing),
use test card `4000 0000 0000 0341` to trigger payment failure on an active
subscription. Per
[docs.stripe.com/billing/revenue-recovery/smart-retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries),
Smart Retries can be configured for up to 8 attempts within a 2-month window;
`invoice.payment_failed` fires on each failed attempt with `attempt_count`
and `next_payment_attempt` fields.

```typescript
// Attach a card that will decline on recurring collection
const failMethod = await stripe.paymentMethods.attach('pm_card_chargeDeclinedInsufficientFunds', {
  customer: customer.id,
});
await stripe.customers.update(customer.id, {
  invoice_settings: { default_payment_method: failMethod.id },
});

// Advance past the renewal date
await stripe.testHelpers.testClocks.advance(clock.id, {
  advances_to: toEpoch('2025-02-02'),  // One day past renewal
});
await waitForClockReady(clock.id);

const invoice = await getLatestInvoice(sub.id);
expect(invoice.status).toBe('open');

const sub2 = await stripe.subscriptions.retrieve(sub.id);
expect(sub2.status).toBe('past_due');
// Assert invoice.payment_failed was received with attempt_count >= 1
```

Webhook sequence on failed renewal:

| Event | Key field to assert |
|---|---|
| `invoice.payment_failed` | `attempt_count`, `next_payment_attempt` |
| `customer.subscription.updated` | `status: past_due` |

Test recovery: attach a valid payment method, then call
`stripe.invoices.pay(invoice.id)` and assert `invoice.paid` fires and
subscription returns to `active`.

## Step 5 - Cancel and reactivation

```typescript
// Cancel at period end (access persists until billing cycle closes)
await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
const canceling = await stripe.subscriptions.retrieve(sub.id);
expect(canceling.cancel_at_period_end).toBe(true);

// Advance past period end
await stripe.testHelpers.testClocks.advance(clock.id, {
  advances_to: toEpoch('2025-02-02'),
});
await waitForClockReady(clock.id);

const canceled = await stripe.subscriptions.retrieve(sub.id);
expect(canceled.status).toBe('canceled');
// Assert: customer.subscription.deleted webhook fired

// Reactivation: create a new subscription (canceled is terminal)
const reactivated = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: PRICE_ID }],
});
expect(reactivated.status).toBe('active');
```

Per
[docs.stripe.com/billing/subscriptions/overview](https://docs.stripe.com/billing/subscriptions/overview),
`canceled` is a terminal state; reactivation means creating a fresh
subscription, not updating the canceled one.

## Step 6 - Webhook event matrix

Per
[docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing),
the full set of events your handler must process:

| Event | Trigger | Required handler action |
|---|---|---|
| `customer.subscription.created` | New subscription | Record subscription ID + status |
| `customer.subscription.trial_will_end` | 3 days before trial end | Notify customer |
| `customer.subscription.updated` | Any status or plan change | Sync local subscription record |
| `customer.subscription.deleted` | Cancellation takes effect | Revoke access |
| `invoice.created` | Invoice generated at renewal | Finalize within 72 hours |
| `invoice.finalized` | Invoice ready for collection | Log for audit |
| `invoice.paid` | Payment succeeded | Provision or extend access |
| `invoice.payment_failed` | Payment attempt failed | Notify customer; track `attempt_count` |
| `invoice.payment_action_required` | 3DS required on renewal | Prompt re-authentication |

Trigger these in CI using the Stripe CLI:

```bash
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
```

Per
[docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli), forward
webhook events to a local handler during development:

```bash
stripe listen --forward-to http://localhost:3000/webhooks/stripe
```

## Running

```bash
npm test -- --testPathPattern=billing
```

For integration tests that drive test clocks:

```bash
STRIPE_TEST_KEY=sk_test_... npm test -- --testPathPattern=billing/integration
```

## CI integration

```yaml
jobs:
  billing-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test -- --testPathPattern=billing
        env:
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
```

Test-clock tests do not require `stripe listen` because they drive the
Stripe API directly without local webhook forwarding. Signature verification
tests do need `STRIPE_WEBHOOK_SECRET`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `setTimeout` to wait for trial end | Flaky and slow in CI | Use test clock + `waitForClockReady` |
| Asserting subscription state before clock is `ready` | Race condition; events not yet fired | Poll `GET /v1/test_helpers/test_clocks/{id}` |
| Reusing a test clock customer across test cases | Shared state leaks between scenarios | Create a fresh clock + customer per scenario |
| Canceling and immediately reusing as `active` | `canceled` is terminal | Create a new subscription for reactivation |
| Skipping `invoice.paid` handler | Access provisioned on subscription create, not payment | Provision only after `invoice.paid` |
| Omitting `proration_date` from preview AND update calls | Timing skew makes amounts disagree | Use the same epoch timestamp for both |
| Testing only `invoice.payment_failed` once | Smart Retries fires multiple times with growing `attempt_count` | Test at least two retry cycles |

## Limitations

- Test clocks only work in sandbox (test mode); they are not available in
  live mode.
- Per
  [docs.stripe.com/api/test_clocks](https://docs.stripe.com/api/test_clocks),
  a test clock cannot be advanced backward; frozen time is monotonically
  forward-only.
- Smart Retry timing in test mode compresses retry intervals; exact retry
  schedule differs from production per
  [docs.stripe.com/billing/revenue-recovery/smart-retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries).
- Stripe CLI `trigger` sends synthetic events; test-clock-driven tests
  produce real invoice objects and are preferred for billing accuracy.

## References

- Stripe Billing testing:
  [docs.stripe.com/billing/testing](https://docs.stripe.com/billing/testing).
- Test clocks API:
  [docs.stripe.com/api/test_clocks](https://docs.stripe.com/api/test_clocks).
- Subscription lifecycle:
  [docs.stripe.com/billing/subscriptions/overview](https://docs.stripe.com/billing/subscriptions/overview).
- Prorations:
  [docs.stripe.com/billing/subscriptions/prorations](https://docs.stripe.com/billing/subscriptions/prorations).
- Smart Retries:
  [docs.stripe.com/billing/revenue-recovery/smart-retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries).
- Stripe CLI:
  [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli).
- Sibling skills:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`payment-webhook-replay`](../payment-webhook-replay/SKILL.md).
