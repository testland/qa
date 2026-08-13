---
name: payment-gateway-sandboxes
description: "Wraps the vendor-generic payment-gateway sandbox pattern - test credentials, sandbox base URLs / environment switches, deterministic test-card matrices, and gateway-native webhook simulators - with per-gateway references for Adyen test mode, PayPal Sandbox, and Braintree sandbox. Use when testing code integrated with Adyen, PayPal, or Braintree; for Stripe use stripe-test-cards-and-webhooks (one-time payments) or stripe-subscription-billing-test-author (recurring billing)."
---

# payment-gateway-sandboxes

## Overview

Every major payment gateway ships the same four sandbox primitives, each under
a different name:

1. **Test credentials** - a sandbox API key / merchant account that can never
   move real money.
2. **An environment switch** - a sandbox base URL or an SDK `environment`
   flag that routes calls to the test stack.
3. **A deterministic test-card matrix** - specific PANs (or amounts) that
   trigger specific outcomes: success, decline, 3DS challenge.
4. **A webhook simulator / resend surface** - a way to fire or replay
   asynchronous events at your handler on demand.

This skill is the single entry point for the non-Stripe gateways. The body
covers the shared pattern; the per-gateway mechanics live in references/.

## Routing table

| Gateway | Reference | Distinctive sandbox trait |
|---|---|---|
| Adyen | [references/adyen.md](references/adyen.md) | Explicit sync-API / async-notification duality; HMAC-validated notifications |
| PayPal | [references/paypal.md](references/paypal.md) | Sandbox Business + Personal accounts; dashboard + API webhook simulator |
| Braintree | [references/braintree.md](references/braintree.md) | Amount-based magic values; sandbox-only `gateway.testing.settle` |
| Stripe | `stripe-test-cards-and-webhooks` | Stripe CLI (`stripe listen` / `stripe trigger`); test clocks in `stripe-subscription-billing-test-author` |

## When to use

- Authoring tests for code integrated with Adyen, PayPal, or Braintree.
- Wiring a gateway sandbox into CI (credentials, env switch, webhook secrets).
- Porting an existing single-gateway suite to a second gateway.

## The shared sandbox test pattern

Regardless of gateway, a payment integration suite has the same skeleton:

1. **Initialize the SDK against the sandbox environment** - never a prod
   key; the environment switch is an env var, not a hardcode.
2. **Drive each documented test-card outcome** - one test per outcome row
   (success, decline variants, 3DS frictionless, 3DS challenge), asserting
   the gateway's own result-code vocabulary.
3. **Verify webhook signatures** - every gateway signs its events
   (HMAC-SHA256 for Adyen, SHA256-with-RSA for PayPal, `bt_signature`
   parsing for Braintree); the suite must reject unsigned and wrong-secret
   payloads.
4. **Prove handler idempotency under redelivery** - all three gateways
   redeliver unacknowledged events; process-exactly-once is the contract.
   The full replay workflow is `payment-flow-test-author`.
5. **Map the state machine** - each gateway names the same lifecycle
   differently; translate via `payment-flow-states-reference` before
   asserting on states.

## CI integration

Sandbox credentials are secrets like any other:

```yaml
jobs:
  gateway-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
        env:
          ADYEN_TEST_API_KEY: ${{ secrets.ADYEN_TEST_API_KEY }}
          PAYPAL_SANDBOX_CLIENT_ID: ${{ secrets.PAYPAL_SANDBOX_CLIENT_ID }}
          BT_SANDBOX_MERCHANT_ID: ${{ secrets.BT_SANDBOX_MERCHANT_ID }}
```

Per-gateway variable lists are in each reference.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Prod credentials in tests | Real settlement / real charges | Sandbox-only keys, per-env config |
| Skip webhook signature validation | Spoofed events trigger fulfillment | Verify per the gateway's scheme |
| Treat the sync API return as final | All three gateways finalize async | Webhook-driven state, per `payment-flow-states-reference` |
| One happy-path test | Decline / 3DS / fraud paths untested | One test per documented outcome row |
| Hardcoded merchant/account IDs | Per-env accounts drift | Env vars |
| One suite for all gateways | Result-code vocabularies differ | Per-gateway test directory |

## Limitations

- **Sandbox fidelity varies.** Braintree settles synchronously via a
  test-only API; prod settles overnight. PayPal sandbox webhooks can lag.
- **Client-side surfaces need a browser.** Drop-in / Hosted Fields /
  PayPal-button flows require Playwright against the sandbox UI.
- **Region-specific payment methods** (iDEAL, Sofort, etc.) have separate
  test flows not covered here.

## References

- Adyen test mode, test cards, result codes, HMAC notifications:
  [references/adyen.md](references/adyen.md).
- PayPal Sandbox accounts, Orders v2, webhook simulator:
  [references/paypal.md](references/paypal.md).
- Braintree sandbox, amount-based magic values, webhook parser:
  [references/braintree.md](references/braintree.md).
- Companion catalog: `payment-flow-states-reference` (state machines + 3DS
  flows).
- Flow suites on top of the sandboxes: `payment-flow-test-author`.
- Stripe: `stripe-test-cards-and-webhooks`,
  `stripe-subscription-billing-test-author`.
