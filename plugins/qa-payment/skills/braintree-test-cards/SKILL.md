---
name: braintree-test-cards
description: "Wraps Braintree (PayPal-owned) sandbox testing patterns: sandbox merchant credentials, Drop-in / Hosted Fields client-side patterns, the Transaction lifecycle (submitted_for_settlement → settled), Braintree's distinctive test-card behaviours (specific PANs trigger specific errors), and the webhook verification (Braintree Webhook Parser). Use when testing Braintree-integrated code. Composes payment-flow-states-reference + 3ds-test-flow-reference."
rating: 21
d6: 4
archetype: S1
---

# braintree-test-cards

## Overview

Per [developer.paypal.com/braintree/docs/reference/general/testing](https://developer.paypal.com/braintree/docs/reference/general/testing),
the Braintree sandbox accepts the same API as production with
deterministic test-card responses.

The notable distinction: Braintree's Transaction state machine
includes an explicit `submitted_for_settlement` → `settled`
transition with **simulated settlement** in sandbox.

## When to use

- Tests for code using Braintree.
- Drop-in / Hosted Fields client-side flow tests.
- 3DS tests per
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md).

## Authoring

### Setup

Get sandbox credentials at
[braintreepayments.com/sandbox](https://braintreepayments.com/sandbox) —
merchant ID + public + private keys.

### Install

```bash
npm install braintree
pip install braintree
```

### Initialize

```typescript
import braintree from 'braintree';

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BT_SANDBOX_MERCHANT_ID!,
  publicKey: process.env.BT_SANDBOX_PUBLIC_KEY!,
  privateKey: process.env.BT_SANDBOX_PRIVATE_KEY!,
});
```

### Test cards

Per [developer.paypal.com/braintree/docs/reference/general/testing/node](https://developer.paypal.com/braintree/docs/reference/general/testing/node):

| Card | Behaviour |
|---|---|
| 4111 1111 1111 1111 | Authorized + settled |
| 5555 5555 5555 4444 | Authorized + settled (Mastercard) |
| 4000 1111 1111 1115 | Processor declined (general) |
| 4000 0000 0000 0002 | Processor declined |
| 4000 0000 0000 1109 | 3DS frictionless |
| 4000 0000 0000 1091 | 3DS challenge |

By **amount**:

| Amount | Behaviour |
|---|---|
| $2000.00 | Processor declined (insufficient funds) |
| $2999.00 | Fraud failure |
| $3000.00 | Bank failure |

This **amount-based behaviour** is unique to Braintree.

### Transaction

```typescript
const result = await gateway.transaction.sale({
  amount: '10.00',
  paymentMethodNonce: 'fake-valid-nonce',  // From Braintree client SDK
  options: { submitForSettlement: true },
});

expect(result.success).toBe(true);
expect(result.transaction.status).toBe('submitted_for_settlement');
```

`fake-valid-nonce` is a sandbox-only nonce that represents a
successful tokenization. Real flow uses Drop-in or Hosted Fields
to produce a real nonce.

### Settle in sandbox

Sandbox transactions don't auto-settle; you can force settlement
via the testing API:

```typescript
await gateway.testing.settle(transactionId);
const result = await gateway.transaction.find(transactionId);
expect(result.status).toBe('settled');
```

Per [developer.paypal.com/braintree/docs/reference/general/testing/node#settle-transaction](https://developer.paypal.com/braintree/docs/reference/general/testing/node):
the testing methods are sandbox-only.

### Refund

```typescript
const refundResult = await gateway.transaction.refund(transactionId);
expect(refundResult.transaction.type).toBe('credit');
```

Refunds can only happen after settlement; submit-for-settlement
then settle (testing) then refund.

### Webhook handling

Per [developer.paypal.com/braintree/docs/guides/webhooks](https://developer.paypal.com/braintree/docs/guides/webhooks):

```typescript
const webhookNotification = await gateway.webhookNotification.parse(
  request.body.bt_signature,
  request.body.bt_payload,
);

expect(webhookNotification.kind).toBeDefined();
// e.g., 'transaction_settled', 'transaction_settlement_declined'
```

The parser validates the signature; an invalid one throws.

### Drop-in / Hosted Fields flow

Client-side (browser):

```javascript
braintree.dropin.create({
  authorization: clientToken,
  selector: '#dropin-container',
}, (err, instance) => {
  // ...
  instance.requestPaymentMethod((err, payload) => {
    // payload.nonce — send to server
    fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ nonce: payload.nonce }) });
  });
});
```

Tests for this layer need Playwright + Drop-in's test mode.

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  braintree-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
        env:
          BT_SANDBOX_MERCHANT_ID: ${{ secrets.BT_SANDBOX_MERCHANT_ID }}
          BT_SANDBOX_PUBLIC_KEY: ${{ secrets.BT_SANDBOX_PUBLIC_KEY }}
          BT_SANDBOX_PRIVATE_KEY: ${{ secrets.BT_SANDBOX_PRIVATE_KEY }}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use prod credentials in tests | Real charges | Sandbox-only |
| Skip `submitForSettlement: true` | Transaction stays in authorized state | Set explicitly |
| Test refund without settlement | Refund requires settled state | Settle first via testing API |
| Hardcoded amounts ignoring magic values | Trip amount-based behaviours unexpectedly | Document amount-vs-behaviour |
| Use `fake-valid-nonce` in production code path | Sandbox-only | Real nonces from Drop-in |
| Skip webhook signature validation | Spoof risk | `gateway.webhookNotification.parse` validates |
| Long-polling settled-state in tests | Slow | `gateway.testing.settle` synchronously |
| Test only success path | Decline / fraud / bank-failure paths matter | Test amount-based magic values |

## Limitations

- **Amount-based test behaviour is sandbox-specific.** Production
  doesn't use these magic values.
- **Settlement is real-time in test via testing API.** Prod
  settlement is overnight batch.
- **Drop-in / Hosted Fields require browser context.** Server
  unit tests use fake nonces; full flow needs Playwright.
- **`gateway.testing.*` methods don't exist in production.** Be
  deliberate about test-only code paths.

## References

- Braintree testing:
  [developer.paypal.com/braintree/docs/reference/general/testing](https://developer.paypal.com/braintree/docs/reference/general/testing).
- Node SDK testing:
  [developer.paypal.com/braintree/docs/reference/general/testing/node](https://developer.paypal.com/braintree/docs/reference/general/testing/node).
- Webhook guide:
  [developer.paypal.com/braintree/docs/guides/webhooks](https://developer.paypal.com/braintree/docs/guides/webhooks).
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Sibling SDKs:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md).
