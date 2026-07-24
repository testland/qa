---
name: payment-flow-states-reference
description: "Pure-reference catalog of payment lifecycle state machines across Stripe, Adyen, PayPal, and Braintree. Covers the canonical states (created / requires_action / processing / succeeded / requires_capture / canceled / failed), authorisation vs capture (separate vs combined), the asynchronous webhook states, refund / dispute / chargeback transitions, and the per-platform terminology mapping (Stripe PaymentIntent.status vs Adyen Authorisation/Capture vs PayPal Order). Use when designing tests for payment flows or auditing state-handling code."
---

# payment-flow-states-reference

## Overview

Every payment platform exposes a state machine - the
PaymentIntent in Stripe, the Authorisation in Adyen, the Order
in PayPal, the Transaction in Braintree. Each has different
terminology for what is fundamentally the same lifecycle.

Per [stripe.com/docs/payments/payment-intents](https://docs.stripe.com/payments/payment-intents):
"The PaymentIntent encapsulates the lifecycle of a customer
payment."

## When to use

- Designing a payment-flow test suite.
- Auditing state-handling code for a payment integration.
- Mapping equivalent states across multiple providers.
- Investigating "stuck payment" reports.

## The canonical states

Most payment systems share the same conceptual states:

| State | Stripe | Adyen | PayPal | Braintree |
|---|---|---|---|---|
| Created | `requires_payment_method` | `Received` | `CREATED` | created |
| Awaiting action (3DS, etc.) | `requires_action` | `RedirectShopper` | `PAYER_ACTION_REQUIRED` | n/a (handled inline) |
| Processing | `processing` | `Pending` | `PENDING` | submitted_for_settlement |
| Authorized (not captured) | `requires_capture` | `Authorised` | `APPROVED` (no immediate capture) | authorized |
| Captured / succeeded | `succeeded` | `[Capture] Settled` | `COMPLETED` | settled |
| Failed | `failed` (charge) | `Refused` | `DECLINED` | gateway_rejected / failed |
| Cancelled | `canceled` | `Cancelled` | `VOIDED` | voided |
| Refunded | `succeeded` + refund object | `[Refund] Settled` | `REFUNDED` | refunded |
| Disputed / chargeback | `disputed` (in `dispute` object) | `[Chargeback]` | `dispute` | disputed |

## Authorisation vs capture

Two-step:

1. **Authorize** - bank reserves funds; merchant doesn't get
   them yet.
2. **Capture** - funds transferred to merchant.

Default in most systems is auto-capture (auth + capture in one
call). Separate auth-then-capture is used for:

- Hold-then-charge flows (rental cars, hotels).
- Inventory-confirm-before-charge.
- Manual fraud review.

Per [stripe.com/docs/payments/capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method):
`PaymentIntent` with `capture_method=manual` requires explicit
capture call.

## Webhook event sequence

The webhook events emitted per state transition. Stripe example:

```
1. customer.created
2. payment_intent.created
3. payment_intent.requires_action   (if 3DS)
4. payment_intent.processing
5. payment_intent.succeeded
   AND
   charge.succeeded
```

The asynchronous nature means tests must wait for webhook
arrival, not rely on synchronous API return.

## Refund states

```
captured payment
   ↓
   refund created (status: pending)
   ↓
   refund succeeded (or failed)
```

Per [stripe.com/docs/refunds](https://docs.stripe.com/refunds):
refunds are async; the API call returns immediately with
`pending`, then a webhook delivers the final state minutes to
hours later.

## Dispute / chargeback states

The most-complex part of the state machine. Per Visa's
chargeback reason codes (cite by stable ID: Visa Chargeback
Reason Codes), the customer's bank initiates the chargeback;
the merchant has a fixed window to respond.

| State | Meaning |
|---|---|
| Inquiry | Bank requests info; not yet a chargeback |
| Pre-arbitration | Initial dispute filed |
| Won | Merchant evidence accepted |
| Lost | Merchant evidence rejected; funds returned to customer |
| Pre-arbitration accepted | Merchant accepts the loss |

Per [stripe.com/docs/disputes](https://docs.stripe.com/disputes):
disputes resolve over weeks; test scenarios use Stripe's test-
mode dispute API to trigger transitions synchronously.

## Idempotency

Most payment APIs accept an `Idempotency-Key` header (Stripe,
Adyen) or equivalent. The pattern: retry with the same key
produces the same response.

Per [stripe.com/docs/api/idempotent_requests](https://docs.stripe.com/api/idempotent_requests):
"Stripe supports idempotency for safely retrying requests
without accidentally performing the same operation twice."

Tests should verify the merchant code uses idempotency keys
for **every** mutating call.

## State-handling test surface

| Surface | Test |
|---|---|
| Created → succeeded (happy path) | Standard test-card; assert each state observed |
| Requires-action (3DS) | Initiate with a challenge test card ([Stripe](https://docs.stripe.com/testing#regulatory-cards) `4000 0027 6000 3184`, [Adyen](https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers) `4917 6100 0000 0000`); assert `requires_action` / `RedirectShopper` with `next_action.type = redirect_to_url`; complete the issuer-hosted challenge; confirm and assert `succeeded`. Repeat with a frictionless card (Stripe `4000 0000 0000 3055`) - must reach `succeeded` with no challenge. Per `3ds-test-flow-reference` |
| Failed (insufficient funds) | Use insufficient-funds test card; assert state |
| Cancelled before capture | Manual-capture + cancel; assert state |
| Webhook idempotency | Replay webhook twice; assert idempotent handling |
| Refund full | Capture + full refund; assert state sequence |
| Refund partial | Capture + partial refund; assert state |
| Dispute won | Trigger dispute; respond; assert won |
| Dispute lost | Trigger dispute; don't respond; assert lost |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating the API return as the final state | Async; succeeded comes later | Wait for webhook |
| No idempotency key | Network retries duplicate-charge customers | Always set idempotency |
| Hardcoded sleep waiting for webhooks | Flaky | Poll webhook endpoint or queue with timeout |
| Skipping the requires-action flow | 3DS regulations require it for most EU cards | Always test 3DS path |
| Stale state stored locally | Local DB diverges from platform | Webhook-driven update |
| Trust the request-body status | Webhooks can be replayed by attackers | Verify signature + idempotency |
| One test for all platforms | State terminology differs | Per-platform test suite |
| Refund tests in sync flow | Refunds are async | Webhook-based |

## Limitations

- **Platforms evolve.** Stripe added the `setup_intent` for
  saved payment methods; PayPal's Orders API is newer than the
  legacy Payments API.
- **Regulatory states change.** EU PSD2 introduced strong
  customer authentication; states evolved to support it.
- **Refund + dispute timelines.** Real-world chargebacks take
  weeks; test environments shortcut this.

## References

- Stripe PaymentIntent lifecycle:
  [docs.stripe.com/payments/payment-intents](https://docs.stripe.com/payments/payment-intents).
- Adyen payment lifecycle:
  [docs.adyen.com/online-payments/build-your-integration/payment-result-codes](https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes).
- PayPal Orders API:
  [developer.paypal.com/docs/api/orders/v2/](https://developer.paypal.com/docs/api/orders/v2/).
- Braintree transaction states:
  [developer.paypal.com/braintree/docs/reference/general/statuses](https://developer.paypal.com/braintree/docs/reference/general/statuses).
- Companion catalogs:
  `3ds-test-flow-reference`,
  `pci-dss-scope-reference`.
- Consumed by:
  `stripe-test-cards-and-webhooks`,
  `adyen-test-mode`,
  `paypal-sandbox`,
  `braintree-test-cards`,
  `refund-test-matrix-builder`,
  `chargeback-flow-test-author`,
  `payment-webhook-replay`.
