---
name: adyen-test-mode
description: "Wraps Adyen test-mode patterns: test-API-key initialization, the canonical Adyen test cards (Visa 4111 1111 1111 1111; 5454 5454 5454 5454 3DS frictionless; 4917 6100 0000 0000 3DS 2 challenge), the per-flow result codes (Authorised / Refused / Pending / RedirectShopper / Error), the HMAC-SHA256 webhook validation, and notifications-vs-API duality (Adyen separates synchronous API calls from asynchronous notifications). Use when testing Adyen-integrated code. Composes payment-flow-states-reference + 3ds-test-flow-reference."
rating: 22
d6: 4
---

# adyen-test-mode

## Overview

Adyen's test environment is fully API-compatible with prod. Per
[docs.adyen.com/development-resources/testing](https://docs.adyen.com/development-resources/testing/),
test API keys + test merchant accounts produce deterministic
results based on input.

The notable difference from Stripe: Adyen separates the
**synchronous payment API** from the **asynchronous notification
webhook** more explicitly. Both surfaces need tests.

## When to use

- Tests for code using Adyen's Payments / Checkout / Recurring
  API.
- Webhook handling tests.
- 3DS flow tests per
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md).

## Authoring

### Install

```bash
npm install @adyen/api-library
pip install Adyen
```

### Initialize

```typescript
import { Client, CheckoutAPI } from '@adyen/api-library';

const client = new Client({
  apiKey: process.env.ADYEN_TEST_API_KEY!,
  environment: 'TEST',                  // vs 'LIVE'
});
const checkout = new CheckoutAPI(client);
```

### Test cards

Per [docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers](https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers):

| Card | Behaviour |
|---|---|
| 4111 1111 1111 1111 | Authorised (Visa) |
| 5555 4444 3333 1111 | Authorised (Mastercard) |
| 4000 0000 0000 0119 | Refused (general) |
| 5444 5555 5555 5557 | Refused (insufficient funds) |
| 5454 5454 5454 5454 | 3DS 2 frictionless |
| 4917 6100 0000 0000 | 3DS 2 challenge |
| 4012 8888 8888 1881 | 3DS 1 (deprecated) |

Test expiry: any future date. Test CVC: 737 (special "3DS")
or any 3-digit.

### Payment

```typescript
const paymentResponse = await checkout.payments({
  amount: { currency: 'EUR', value: 1000 },
  paymentMethod: {
    type: 'scheme',
    encryptedCardNumber: 'test_4111111111111111',
    encryptedExpiryMonth: 'test_03',
    encryptedExpiryYear: 'test_2030',
    encryptedSecurityCode: 'test_737',
  },
  reference: 'order-' + uuidv4(),
  merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
});

expect(paymentResponse.resultCode).toBe('Authorised');
```

Result codes per [docs.adyen.com/online-payments/build-your-integration/payment-result-codes](https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes):

| resultCode | Meaning |
|---|---|
| `Authorised` | Approved |
| `Refused` | Declined |
| `Cancelled` | Cancelled |
| `Pending` | Async; final result via notification |
| `RedirectShopper` | 3DS / redirect required |
| `IdentifyShopper` | 3DS device-fingerprint step |
| `ChallengeShopper` | 3DS 2 challenge |
| `Error` | Failure |

### Webhook (notification) handling

Adyen sends webhooks ("notifications") for every state change.
Per [docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures):
validate via HMAC-SHA256 over a canonical-string of the payload.

```typescript
import { hmacValidator } from '@adyen/api-library';
const validator = new hmacValidator();

test('webhook signature valid', () => {
  const notification = { /* notification payload */ };
  const hmacSignature = notification.additionalData.hmacSignature;
  const isValid = validator.validateHMAC(notification, process.env.ADYEN_HMAC_KEY!);
  expect(isValid).toBe(true);
});
```

### Notification idempotency

Adyen redelivers notifications until acknowledged with HTTP 200
+ `[accepted]` body. Tests should verify the handler is
idempotent under redelivery:

```typescript
test('redelivered notification handled idempotently', async () => {
  const notif = makeTestNotification();
  await handler(notif);
  const before = await db.payments.count();
  await handler(notif);  // re-delivered
  const after = await db.payments.count();
  expect(after).toBe(before);
});
```

### Notifications test mode

Per Adyen docs: in Customer Area, you can re-send notifications
on demand for testing. Also exposes a webhook-events endpoint
for replay.

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  adyen-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
        env:
          ADYEN_TEST_API_KEY: ${{ secrets.ADYEN_TEST_API_KEY }}
          ADYEN_MERCHANT_ACCOUNT: ${{ secrets.ADYEN_TEST_MERCHANT_ACCOUNT }}
          ADYEN_HMAC_KEY: ${{ secrets.ADYEN_TEST_HMAC_KEY }}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use prod API key in tests | Real settlement risk | Strict TEST environment |
| Skip HMAC signature validation | Webhook spoofing | Always validate |
| Treat resultCode=`Pending` as failure | Async; final via notification | Wait for webhook |
| One unit test for "happy path" only | Refused / RedirectShopper paths untested | Per-resultCode test |
| Hardcoded merchant account in code | Per-env account; tests pass against wrong account | Env var |
| Reply `[accepted]` even on processing-error | Adyen stops retrying | Reply only on successful processing |
| Skip 3DS 2 challenge test | Required by EU regulations | Test 4917 6100 0000 0000 path |
| Encrypted-data fields wrong format | Adyen rejects with cryptic error | Use Adyen-SDK encryption helpers |

## Limitations

- **Adyen test mode uses encrypted data placeholders.** Real
  encryption uses Adyen Web SDK; tests use `test_*` placeholders.
- **Notification SLA varies.** Real-time webhooks but
  retried-on-failure can be hours later.
- **Recurring API has separate test cards.** Tokenisation
  scenarios need their own surface.
- **Region-specific payment methods.** iDEAL / Sofort / etc.
  have separate test flows.

## References

- Adyen testing:
  [docs.adyen.com/development-resources/testing](https://docs.adyen.com/development-resources/testing/).
- Test card numbers:
  [docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers](https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers).
- Result codes:
  [docs.adyen.com/online-payments/build-your-integration/payment-result-codes](https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes).
- Webhook HMAC verification:
  [docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures).
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`3ds-test-flow-reference`](../3ds-test-flow-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Sibling SDKs:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`paypal-sandbox`](../paypal-sandbox/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
