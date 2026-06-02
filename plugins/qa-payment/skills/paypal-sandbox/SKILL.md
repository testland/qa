---
name: paypal-sandbox
description: "Wraps PayPal Sandbox testing patterns: sandbox account creation (Business + Personal accounts in developer.paypal.com), the Orders v2 API (create / capture / refund), webhook event simulator (developer.paypal.com webhook simulator), sandbox-account-specific test cards, and the OAuth2 client-credentials flow for sandbox. Use when testing PayPal-integrated code. Composes payment-flow-states-reference."
rating: 21
d6: 4
archetype: S1
---

# paypal-sandbox

## Overview

PayPal Sandbox is a parallel environment that mirrors the prod
PayPal API. Per
[developer.paypal.com/tools/sandbox](https://developer.paypal.com/tools/sandbox/),
sandbox accounts (Business + Personal) are created in the
developer dashboard; tests use sandbox client credentials.

The current canonical API is **Orders v2**
([developer.paypal.com/docs/api/orders/v2](https://developer.paypal.com/docs/api/orders/v2/));
older Payments API (v1) is deprecated.

## When to use

- Tests for code using PayPal Checkout (PayPal button, etc.).
- Webhook handling.
- OAuth-based sandbox flows.

## Authoring

### Setup

1. Create developer account at
   [developer.paypal.com](https://developer.paypal.com/).
2. Create Business + Personal sandbox accounts (one Business
   for merchant; one or more Personal for buyers).
3. Get sandbox client ID + secret.

### Install

```bash
npm install @paypal/checkout-server-sdk
pip install paypalserversdk
```

### OAuth2 client credentials

```typescript
import paypal from '@paypal/checkout-server-sdk';

const env = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_SANDBOX_CLIENT_ID!,
  process.env.PAYPAL_SANDBOX_SECRET!,
);
const client = new paypal.core.PayPalHttpClient(env);
```

### Create order

```typescript
const request = new paypal.orders.OrdersCreateRequest();
request.requestBody({
  intent: 'CAPTURE',
  purchase_units: [{ amount: { currency_code: 'USD', value: '10.00' } }],
});

const order = await client.execute(request);
expect(order.result.status).toBe('CREATED');
expect(order.result.id).toBeTruthy();
```

### Capture order (after buyer approval)

```typescript
const captureRequest = new paypal.orders.OrdersCaptureRequest(order.result.id);
captureRequest.requestBody({});

const capture = await client.execute(captureRequest);
expect(capture.result.status).toBe('COMPLETED');
```

In test code, you need a sandbox buyer to approve the order via
the PayPal checkout UI - for fully-automated tests, this
requires Playwright + a sandbox Personal account login.

### Sandbox test cards

Per [developer.paypal.com/tools/sandbox/card-testing](https://developer.paypal.com/tools/sandbox/card-testing/):

| Card | Behaviour |
|---|---|
| 4111 1111 1111 1111 | Visa Sandbox success |
| 5555 5555 5555 4444 | Mastercard success |
| 4032 0359 8001 0008 | Decline |

PayPal Sandbox is more PayPal-balance-oriented than card-
oriented; sandbox buyers also have fake "PayPal balance."

### Webhook simulator

Per [developer.paypal.com/api/rest/webhooks/event-names](https://developer.paypal.com/api/rest/webhooks/event-names/):
the developer dashboard exposes a **Webhook Simulator** that
sends any event type to your registered URL.

For automated tests, use the simulator's API:

```bash
curl -X POST 'https://api-m.sandbox.paypal.com/v1/notifications/simulate-event' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "url": "https://example.com/webhook",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    ...
  }'
```

### Webhook signature verification

Per [developer.paypal.com/api/rest/webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/):
PayPal webhooks include `PAYPAL-TRANSMISSION-SIG` and related
headers; verify via PayPal's verification endpoint or local
SDK helper.

```typescript
import { verifyWebhookSignature } from '@paypal/checkout-server-sdk';

const isValid = await verifyWebhookSignature({
  authAlgo: headers['paypal-auth-algo'],
  certUrl: headers['paypal-cert-url'],
  transmissionId: headers['paypal-transmission-id'],
  transmissionSig: headers['paypal-transmission-sig'],
  transmissionTime: headers['paypal-transmission-time'],
  webhookId: process.env.PAYPAL_WEBHOOK_ID!,
  webhookEvent: notificationPayload,
});
expect(isValid).toBe(true);
```

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  paypal-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
        env:
          PAYPAL_SANDBOX_CLIENT_ID: ${{ secrets.PAYPAL_SANDBOX_CLIENT_ID }}
          PAYPAL_SANDBOX_SECRET: ${{ secrets.PAYPAL_SANDBOX_SECRET }}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use live PayPal credentials in tests | Real money | Sandbox-only |
| Test with manual buyer approval | Slow; not CI-suitable | Playwright + sandbox buyer login |
| Skip webhook signature verification | Spoofable | Always verify |
| Hardcode sandbox account IDs | Fragile to account changes | Per-env IDs |
| Test only the API path | Real flow requires checkout UI | Playwright e2e |
| Legacy Payments v1 API | Deprecated | Migrate to Orders v2 |
| Treat `CREATED` as final | Order needs capture | Test the full lifecycle |
| One-shot test for refunds | Refunds are async | Wait for webhook |

## Limitations

- **Sandbox UI is slower than prod.** Playwright e2e against
  sandbox is flaky-prone.
- **Sandbox accounts can be rate-limited.** CI parallelism may
  conflict.
- **Card sandbox testing less first-class** than balance-based
  testing; PayPal expects wallet flows.
- **Webhook delivery in sandbox** sometimes delayed; tests
  need timeouts.
- **Legacy Payments v1 still works** but is deprecated; new code
  should use Orders v2.

## References

- PayPal sandbox docs:
  [developer.paypal.com/tools/sandbox](https://developer.paypal.com/tools/sandbox/).
- Orders v2:
  [developer.paypal.com/docs/api/orders/v2/](https://developer.paypal.com/docs/api/orders/v2/).
- Webhook simulator:
  [developer.paypal.com/api/rest/webhooks/simulate-event](https://developer.paypal.com/api/rest/webhooks/event-names/).
- Webhook signature verification:
  [developer.paypal.com/api/rest/webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/).
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Sibling SDKs:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
