---
name: stripe-test-cards-and-webhooks
description: "Wraps Stripe API testing patterns: test-mode initialization, the canonical test cards (4242 success; 4000 0000 0000 0002 declined; 4000 0027 6000 3184 3DS challenge per 3ds-test-flow-reference), the Stripe CLI webhook flow (`stripe listen --forward-to`), the Stripe CLI fixture commands (`stripe trigger payment_intent.succeeded`), and the webhook signature verification (Stripe-Signature header + HMAC-SHA256). Use when testing Stripe-integrated code. Composes payment-flow-states-reference + 3ds-test-flow-reference + pci-dss-scope-reference."
rating: 23
d6: 4
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
- 3DS challenge flow tests per
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md).

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
| Hardcoded test cards in many tests | Update breakage when Stripe changes | Per [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md), use named constants |
| Skip webhook signature verification | Webhook replay attack | Always verify |
| Tests without idempotency key | Retried tests duplicate-create | Always set idempotency |
| Mix prod + test keys | Real money risk | Strict per-env key separation |
| Test webhook handler without raw body | `body-parser` strips bytes; signature mismatch | Use raw body middleware |
| One-off webhook event tests | Per-event-type integration coverage missed | Test the full event matrix relevant to your flow |
| Long-running stripe listen in CI | Hangs builds | Use `stripe listen --print-secret` then background |

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
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Sibling SDKs:
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
- Builders:
  [`refund-test-matrix-builder`](../refund-test-matrix-builder/SKILL.md),
  [`chargeback-flow-test-author`](../chargeback-flow-test-author/SKILL.md),
  [`payment-webhook-replay-skill`](../payment-webhook-replay-skill/SKILL.md).
