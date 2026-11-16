---
name: stripe-test-cards-and-webhooks
description: "Use for any question or task about testing Stripe payments, including one webhook handler and checkout that fails for 3D Secure cards: test-mode keys, test cards for success, declines and 3D Secure, stripe listen to forward webhooks locally, stripe trigger fixtures, and Stripe-Signature verification."
---

# stripe-test-cards-and-webhooks

## Overview

Stripe's test-mode is feature-complete: every API call works
against test data, no real money moves. Per
[docs.stripe.com/testing](https://docs.stripe.com/testing), test
keys (sk_test_* / pk_test_*) accept canonical test cards that
deterministically produce success / decline / 3DS challenge.

## When to use

- Tests for code that integrates Stripe.
- Verifying webhook handling.
- 3DS challenge flow tests per the 3DS flows reference in
  `payment-flow-test-author` (its payment-states reference).

## Authoring

### Install

```bash
npm install stripe
pip install stripe
```

Test keys come from the Stripe Dashboard (Developers → API
keys → toggle to "View test data").

### Initialize

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_TEST_KEY!);
```

### Canonical test cards

Per [docs.stripe.com/testing](https://docs.stripe.com/testing):

| Card | Behaviour |
|---|---|
| 4242 4242 4242 4242 | Success (Visa) |
| 5555 5555 5555 4444 | Success (Mastercard) |
| 4000 0000 0000 0002 | Decline (generic_decline) |
| 4000 0000 0000 0341 | Attaches to a Customer, then every charge fails (`pm_card_chargeCustomerFail`) |
| 4000 0000 0000 9995 | Decline (insufficient_funds) |
| 4000 0000 0000 9987 | Decline (lost_card) |
| 4000 0000 0000 0069 | Expired card |
| 4000 0027 6000 3184 | 3DS authentication required (challenge) |
| 4000 0000 0000 3055 | 3DS supported but frictionless |
| 4100 0000 0000 0019 | Fraud-prevention block |

Test PAN any future expiry; any 3-digit CVC.

### PaymentIntent end-to-end

```typescript
test('successful payment via 4242', async () => {
  const intent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    confirm: true,
    return_url: 'https://example.com/return',
  });
  expect(intent.status).toBe('succeeded');
});

test('declined payment', async () => {
  await expect(
    stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      payment_method: 'pm_card_chargeDeclined',
      confirm: true,
      return_url: 'https://example.com/return',
    })
  ).rejects.toThrow(/card was declined/);
});
```

### Webhook handler test

```typescript
import { buffer } from 'micro';
import handler from './stripe-webhook';

test('webhook handler validates signature', async () => {
  const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: {...} });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });

  const req = { headers: { 'stripe-signature': signature }, body: Buffer.from(payload) };
  const res = await handler(req as any);
  expect(res.statusCode).toBe(200);
});
```

Per [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures):
the Stripe CLI's `generateTestHeaderString` produces a valid
HMAC-SHA256 signature for testing.

### Stripe CLI local forwarding

Per [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to http://localhost:3000/webhooks/stripe
# Forwards real Stripe webhook events to your local endpoint
```

```bash
stripe trigger payment_intent.succeeded
# Sends a synthetic event to test your handler
```

The CLI also exposes a signing secret (different from your prod
webhook secret) for local testing.

### Idempotency

```typescript
test('idempotency key prevents duplicate charges', async () => {
  const key = 'order-12345';
  const r1 = await stripe.paymentIntents.create({...}, { idempotencyKey: key });
  const r2 = await stripe.paymentIntents.create({...}, { idempotencyKey: key });
  expect(r1.id).toBe(r2.id);  // Same PaymentIntent
});
```

### Checkout fulfillment: only when paid, only once

Stripe's fulfillment guide sets two rules that most handlers miss
([docs.stripe.com/checkout/fulfillment](https://docs.stripe.com/checkout/fulfillment)):

- **Delayed payment methods.** For methods such as ACH Direct Debit and other
  bank debits, "funds won't be immediately available when Checkout
  completes": `checkout.session.completed` arrives while the payment is still
  processing. Check the session's `payment_status` before fulfilling (the
  guide fulfills when it is not `unpaid`), fulfill on
  `checkout.session.async_payment_succeeded`, and handle
  `checkout.session.async_payment_failed` without shipping.
- **More than one caller.** The fulfill function "might be called multiple
  times, possibly concurrently, for the same Checkout Session" (the webhook
  and the success page, or a redelivered event). A read-then-check of the
  order status races; claim the session atomically before shipping:

```sql
UPDATE orders SET status = 'fulfilling'
WHERE checkout_session_id = $1 AND status = 'awaiting_fulfillment'
RETURNING id;   -- no row returned: another caller already claimed it, do not ship
```

Test each path with signed events (see the handler test above):

| Event and session state | Expected |
|---|---|
| `checkout.session.completed`, `payment_status: 'unpaid'` (bank debit) | Nothing shipped; order waits |
| `checkout.session.async_payment_succeeded` | Shipped once |
| `checkout.session.async_payment_failed` | Not shipped; order cancelled or customer told |
| Same session fulfilled twice at once (`Promise.all`) | Shipped once |

### Subscriptions over time: test clocks

Jest or Sinon fake timers move only your process's clock; Stripe's billing
runs on Stripe's time. Use a test clock
([docs.stripe.com/billing/testing/test-clocks/api-advanced-usage](https://docs.stripe.com/billing/testing/test-clocks/api-advanced-usage)):

```typescript
const clock = await stripe.testHelpers.testClocks.create({ frozen_time: start });
const customer = await stripe.customers.create({
  test_clock: clock.id,
  payment_method: 'pm_card_visa',
  invoice_settings: { default_payment_method: 'pm_card_visa' },
});
const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price }] });

async function advanceTo(t: number) {
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: t });
  // advancing takes a few seconds; assert only once the clock is ready
  while ((await stripe.testHelpers.testClocks.retrieve(clock.id)).status !== 'ready') {
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

Rules from the same page that break naive tests:

- Advance at most two intervals of the shortest price per call (two months
  for a monthly plan); loop for a year.
- A renewal invoice stays `draft` for about an hour; advance one more hour
  before expecting it paid.
- List calls skip test-clock objects unless you filter, so list invoices by
  `customer` or `subscription`.
- A clock holds up to three customers; deleting the clock deletes them and
  their subscriptions, so delete it in teardown.
- For a failed renewal, attach `4000 0000 0000 0341`
  (`pm_card_chargeCustomerFail`). Cards that simulate issuer declines
  cannot be attached to a Customer at all
  ([docs.stripe.com/testing](https://docs.stripe.com/testing)), so the test
  would fail at setup instead of at renewal. Expect `invoice.payment_failed`.

## Running

```bash
npm test
```

For webhook-integration tests with `stripe listen` running:

```bash
stripe listen --forward-to http://localhost:3000/webhooks/stripe &
npm test
```

## CI integration

```yaml
jobs:
  stripe-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
        env:
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mocking Stripe SDK directly | Loses signature verification, error mapping | Test against real test-mode API |
| Hardcoded test cards in many tests | Update breakage when Stripe changes | Use named constants for the card PANs |
| Skip webhook signature verification | Webhook replay attack | Always verify |
| Tests without idempotency key | Retried tests duplicate-create | Always set idempotency |
| Mix prod + test keys | Real money risk | Strict per-env key separation |
| Test webhook handler without raw body | `body-parser` strips bytes; signature mismatch | Use raw body middleware |
| One-off webhook event tests | Per-event-type integration coverage missed | Test the full event matrix relevant to your flow |
| Long-running stripe listen in CI | Hangs builds | Use `stripe listen --print-secret` then background |
| Fulfilling on `checkout.session.completed` alone | Bank debits complete unpaid; goods ship before the money arrives | Check `payment_status`; fulfill on `async_payment_succeeded` |
| Fake timers for renewals and trials | Stripe's billing clock never moves | Test clocks, waiting for `ready` |

## Limitations

- **Test mode is real API surface.** Rate limits apply; long
  CI runs can hit them.
- **Dispute timelines compress in test mode.** Use Stripe CLI
  `trigger` to fast-forward dispute states.
- **Webhook delivery has ~30s SLA.** Tests waiting for webhooks
  need timeouts.
- **Doesn't validate platform-side bookkeeping.** Stripe
  reports are separate.

## References

- Stripe testing:
  [docs.stripe.com/testing](https://docs.stripe.com/testing).
- Stripe webhooks:
  [docs.stripe.com/webhooks](https://docs.stripe.com/webhooks).
- Stripe webhook signatures:
  [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures).
- Stripe CLI:
  [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli).
- Checkout fulfillment (payment_status, async payment events, concurrent calls):
  [docs.stripe.com/checkout/fulfillment](https://docs.stripe.com/checkout/fulfillment).
- Test clocks (advance limits, ready status, draft invoices):
  [docs.stripe.com/billing/testing/test-clocks/api-advanced-usage](https://docs.stripe.com/billing/testing/test-clocks/api-advanced-usage).
- Companion catalog:
  `payment-flow-test-author` (its payment-states reference: state machines + 3DS flows);
  PCI scope: `pci-dss-control-test-author` (qa-compliance).
- Other gateways:
  `payment-gateway-sandboxes` (Adyen / PayPal / Braintree).
- Builder:
  `payment-flow-test-author` (refunds, disputes, webhook replay).
