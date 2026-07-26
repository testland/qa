# Per-platform payment state machines

Deep reference for `payment-flow-states-reference` SKILL.md. Consult when
mapping the canonical lifecycle onto a specific provider, or when auditing
that a state-handling integration covers every provider-specific state. The
canonical-state names and the decision workflow stay in the SKILL; the full
per-platform terminology grid, the per-provider state machines, and the
async webhook / refund / dispute detail live here.

## Per-platform terminology mapping

Every provider names the same lifecycle differently. This grid maps each
canonical state to its provider-specific value.

| Canonical state | Stripe | Adyen | PayPal | Braintree |
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

## Per-platform state machines

Each provider exposes one primary object whose status field walks the
lifecycle. Auth-only flows stop at the authorized state until an explicit
capture; auth+capture flows run straight to the captured state.

- **Stripe - `PaymentIntent.status`.** `requires_payment_method` ->
  `requires_action` (if 3DS) -> `processing` -> `succeeded`. With
  `capture_method=manual` the intent stops at `requires_capture` until a
  capture call. Terminal off-path states: `canceled`; a declined charge is
  `failed`. Per
  [docs.stripe.com/payments/payment-intents](https://docs.stripe.com/payments/payment-intents).
- **Adyen - Authorisation then Capture.** `Received` -> `RedirectShopper`
  (if 3DS) -> `Pending` -> `Authorised`, then a separate `[Capture]` event
  reaches `Settled`. Off-path: `Refused`, `Cancelled`, `[Refund] Settled`,
  `[Chargeback]`. Per
  [docs.adyen.com/online-payments/build-your-integration/payment-result-codes](https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes).
- **PayPal - Orders v2.** `CREATED` -> `PAYER_ACTION_REQUIRED` (approval)
  -> `APPROVED` -> capture -> `COMPLETED`. Off-path: `DECLINED`, `VOIDED`,
  `REFUNDED`, plus a `dispute` resource. Per
  [developer.paypal.com/docs/api/orders/v2/](https://developer.paypal.com/docs/api/orders/v2/).
- **Braintree - Transaction status.** created -> `submitted_for_settlement`
  -> `settled`. Auth-only stops at `authorized`. Off-path:
  `gateway_rejected` / `failed`, `voided`, `refunded`, `disputed`. Per
  [developer.paypal.com/braintree/docs/reference/general/statuses](https://developer.paypal.com/braintree/docs/reference/general/statuses).

## Webhook event sequence

Providers emit one webhook per state transition; the async arrival is why
tests must wait for the webhook, not the synchronous API return. Stripe
example:

```
1. customer.created
2. payment_intent.created
3. payment_intent.requires_action   (if 3DS)
4. payment_intent.processing
5. payment_intent.succeeded
   AND
   charge.succeeded
```

## Refund states

```
captured payment
   ↓
   refund created (status: pending)
   ↓
   refund succeeded (or failed)
```

Refunds are async: the API call returns immediately with `pending`, then a
webhook delivers the final state minutes to hours later. Per
[docs.stripe.com/refunds](https://docs.stripe.com/refunds).

## Dispute / chargeback states

The most-complex part of the state machine. Per Visa's chargeback reason
codes (cite by stable ID: Visa Chargeback Reason Codes), the customer's bank
initiates the chargeback and the merchant has a fixed window to respond.

| State | Meaning |
|---|---|
| Inquiry | Bank requests info; not yet a chargeback |
| Pre-arbitration | Initial dispute filed |
| Won | Merchant evidence accepted |
| Lost | Merchant evidence rejected; funds returned to customer |
| Pre-arbitration accepted | Merchant accepts the loss |

Disputes resolve over weeks; test scenarios use test-mode dispute APIs to
trigger the transitions synchronously. Per
[docs.stripe.com/disputes](https://docs.stripe.com/disputes).
