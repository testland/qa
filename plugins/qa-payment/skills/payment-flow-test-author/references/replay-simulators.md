# Gateway-native replay simulators + signature schemes

Deep reference for `payment-flow-test-author` SKILL.md Phase 3. The
per-gateway mechanics for driving and replaying real webhook events, and the
signature-verification gauntlet each gateway needs.

## Replay simulators

Each gateway ships a way to (re)send a real event at the handler:

| Gateway | Replay | Notes |
|---|---|---|
| Stripe | `stripe trigger payment_intent.succeeded`; `stripe events resend evt_test_12345` | CLI ([stripe-cli](https://docs.stripe.com/stripe-cli)); resend covers a 30-day window ([cli/events/resend](https://docs.stripe.com/cli/events/resend)) |
| Adyen | Customer Area transaction "Resend webhook" | Re-sends with the original signature - useful for idempotency tests |
| PayPal | Dashboard simulator; REST equivalent via the API | [simulate-event](https://developer.paypal.com/api/rest/webhooks/event-names/) |
| Braintree | `gateway.webhookTesting.sampleNotification(kind, id)` | Generates a test signature for any event kind ([parse/node](https://developer.paypal.com/braintree/docs/guides/webhooks/parse/node)) |

## Signature schemes

The scheme differs per gateway; run the same four-case gauntlet against each:

| Gateway | Signature scheme | Reference |
|---|---|---|
| Stripe | HMAC-SHA256 over the payload; the signature carries a timestamp, so old timestamps reject | [webhooks/signatures](https://docs.stripe.com/webhooks/signatures) |
| Adyen | HMAC-SHA256 over the canonical string; validated per-event, not per-request | [verify-hmac-signatures](https://docs.adyen.com/development-resources/webhooks/secure-webhooks/verify-hmac-signatures) |
| PayPal | SHA256-with-RSA; verify via the PayPal verification endpoint or SDK helper | [webhooks/rest](https://developer.paypal.com/api/rest/webhooks/rest/) |
| Braintree | parser validates `bt_signature` against the merchant's public key | Braintree webhook parser |

## The four-case signature gauntlet (Stripe form)

Per [docs.stripe.com/webhooks/signatures](https://docs.stripe.com/webhooks/signatures),
the gauntlet is four cases - unsigned, wrong-secret, valid, and
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

Gotcha: the handler must read the **raw request body** - a
parsed-then-restringified copy fails signature verification on the
restringified bytes.

## Sources

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
