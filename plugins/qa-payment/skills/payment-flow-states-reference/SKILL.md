---
name: payment-flow-states-reference
description: "Pure-reference catalog of payment lifecycle state machines across Stripe, Adyen, PayPal, and Braintree: canonical states (created / requires_action / processing / succeeded / requires_capture / canceled / failed), authorisation vs capture, asynchronous webhook states, refund / dispute / chargeback transitions, and the 3-D Secure (EMVCo 3DS 2.x) frictionless / challenge flow paths with per-gateway 3DS test cards (references/3ds-flows.md). Use when designing tests for payment flows, auditing state-handling code, or covering a 3DS round-trip; this is the state model, not a builder - to author suites on it use payment-flow-test-author (refunds, disputes, webhook replay)."
---

# payment-flow-states-reference

## Overview

Every payment platform exposes a state machine - the PaymentIntent in
Stripe, the Authorisation in Adyen, the Order in PayPal, the Transaction in
Braintree. Each has different terminology for what is fundamentally the same
lifecycle.

Per [stripe.com/docs/payments/payment-intents](https://docs.stripe.com/payments/payment-intents):
"The PaymentIntent encapsulates the lifecycle of a customer payment."

The full per-platform terminology grid, the per-provider state machines, and
the async webhook / refund / dispute detail live in
[references/payment-state-machines.md](references/payment-state-machines.md).

## When to use

- Designing a payment-flow test suite.
- Auditing state-handling code for a payment integration.
- Mapping equivalent states across multiple providers.
- Investigating "stuck payment" reports.

## The canonical states

Most payment systems share the same conceptual lifecycle. The canonical
states, in order:

1. **Created** - intent exists, no payment method confirmed yet.
2. **Awaiting action** - a 3DS or redirect challenge is pending.
3. **Processing** - submitted, awaiting the async result.
4. **Authorized (not captured)** - funds reserved; auth-only flows stop here.
5. **Captured / succeeded** - funds transferred to the merchant.
6. **Failed** - declined or rejected.
7. **Cancelled** - voided before capture.
8. **Refunded** - captured then reversed (async).
9. **Disputed / chargeback** - customer's bank pulled the funds.

Each provider names these differently. The full canonical-to-provider grid
and the four per-provider state machines (Stripe PaymentIntent, Adyen
Authorisation/Capture, PayPal Order, Braintree Transaction) are in
[references/payment-state-machines.md](references/payment-state-machines.md).

## Authorisation vs capture

Two-step:

1. **Authorize** - bank reserves funds; merchant doesn't get them yet.
2. **Capture** - funds transferred to merchant.

Default in most systems is auto-capture (auth + capture in one call).
Separate auth-then-capture is used for:

- Hold-then-charge flows (rental cars, hotels).
- Inventory-confirm-before-charge.
- Manual fraud review.

Per [stripe.com/docs/payments/capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method):
`PaymentIntent` with `capture_method=manual` requires explicit capture call.

## How to use

1. **Identify the platform and flow** - which provider, and whether it is
   auth-only or auth+capture (see Authorisation vs capture).
2. **Map its state machine** from
   [references/payment-state-machines.md](references/payment-state-machines.md) -
   translate the canonical states into that provider's terminology.
3. **Enumerate the async transitions** - the webhook states plus the
   refund, dispute, and chargeback transitions the flow can reach.
4. **Derive test cases per transition** - one case per edge, happy and
   off-path (see State-handling test surface).
5. **Assert the state-handling code covers each** - every transition the
   provider can emit has a handler and is webhook-driven, not inferred from
   the synchronous API return.

## Worked example

Map a Stripe `PaymentIntent` lifecycle for a 3DS card that then gets
refunded. The path: `requires_payment_method` -> `requires_action` ->
`processing` -> `succeeded`, then a refund `pending` -> `succeeded`.

Test cases derived, one per transition:

| Transition | Test case |
|---|---|
| `requires_payment_method` -> `requires_action` | Confirm with a challenge card; assert `requires_action` + `next_action.type = redirect_to_url` |
| `requires_action` -> `processing` | Complete the issuer challenge; assert the intent leaves `requires_action` |
| `processing` -> `succeeded` | Wait for `payment_intent.succeeded` webhook; assert final state (not the sync return) |
| `succeeded` -> refund `pending` | Issue a full refund; assert refund object `pending` |
| refund `pending` -> `succeeded` | Wait for `charge.refunded` webhook; assert refund `succeeded` |

Each async assertion waits on the webhook, so the same lifecycle exercised
without 3DS (a frictionless card that skips `requires_action`) is a separate
case, not a variant of this one.

## Idempotency

Most payment APIs accept an `Idempotency-Key` header (Stripe, Adyen) or
equivalent. The pattern: retry with the same key produces the same response.

Per [stripe.com/docs/api/idempotent_requests](https://docs.stripe.com/api/idempotent_requests):
"Stripe supports idempotency for safely retrying requests without
accidentally performing the same operation twice."

Tests should verify the merchant code uses idempotency keys for **every**
mutating call.

## State-handling test surface

| Surface | Test |
|---|---|
| Created → succeeded (happy path) | Standard test-card; assert each state observed |
| Requires-action (3DS) | Initiate with a challenge test card ([Stripe](https://docs.stripe.com/testing#regulatory-cards) `4000 0027 6000 3184`, [Adyen](https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers) `4917 6100 0000 0000`); assert `requires_action` / `RedirectShopper` with `next_action.type = redirect_to_url`; complete the issuer-hosted challenge; confirm and assert `succeeded`. Repeat with a frictionless card (Stripe `4000 0000 0000 3055`) - must reach `succeeded` with no challenge. Per [references/3ds-flows.md](references/3ds-flows.md) |
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

- **Platforms evolve.** Stripe added the `setup_intent` for saved payment
  methods; PayPal's Orders API is newer than the legacy Payments API.
- **Regulatory states change.** EU PSD2 introduced strong customer
  authentication; states evolved to support it.
- **Refund + dispute timelines.** Real-world chargebacks take weeks; test
  environments shortcut this.

## References

- Stripe PaymentIntent lifecycle:
  [docs.stripe.com/payments/payment-intents](https://docs.stripe.com/payments/payment-intents).
- Per-platform state machines (terminology grid, Stripe / Adyen / PayPal /
  Braintree state machines, webhook / refund / dispute detail, with their
  provider-doc citations):
  [references/payment-state-machines.md](references/payment-state-machines.md).
- 3DS 2.x flow paths (frictionless / challenge, SCA under PSD2, per-step test
  surface): [references/3ds-flows.md](references/3ds-flows.md); per-gateway
  3DS test cards: [references/gateway-test-cards.md](references/gateway-test-cards.md).
- PCI DSS scope catalog: `pci-dss-control-test-author` (in the qa-compliance
  plugin) and its references/pci-scope.md.
- Consumed by:
  `stripe-test-cards-and-webhooks`,
  `payment-gateway-sandboxes`,
  `payment-flow-test-author`.
