---
name: 3ds-test-flow-reference
description: "Cross-gateway, protocol-level reference for 3-D Secure (3DS 2.x) test coverage. Covers the EMVCo frictionless / challenge / not-applicable flow paths, SCA under EU PSD2, and the per-PAN test cards for Stripe, Adyen, and Braintree. The gateway-specific wrappers (adyen-test-mode / stripe-test-cards-and-webhooks / braintree-test-cards) compose this skill for single-gateway work, so use one of those for a single-gateway query. Use this skill when designing multi-gateway 3DS test coverage, auditing a 3DS redirect round-trip, or investigating a challenge-flow regression that is not gateway-specific. Composes payment-flow-states-reference."
rating: 22
d6: 4
---

# 3ds-test-flow-reference

## Overview

3-D Secure (3DS) is the EMVCo-specified authentication protocol
for online card payments. Per
[emvco.com](https://www.emvco.com/specifications/), 3DS 2.x is
the current spec (cite by stable ID: EMV 3-D Secure Protocol
Specification v2.x); 3DS 1.0 is deprecated.

3DS adds a verification step between the merchant + the issuing
bank. The customer may be challenged with a one-time code,
biometric prompt, or other factor - or pass through frictionless
based on risk signals.

## When to use

- Designing test coverage for a payment integration handling
  3DS.
- Auditing existing 3DS flow implementation.
- Investigating "customer says 3DS challenge looked broken"
  reports.
- PR review of payment-redirect flows.

## The three flow outcomes

Per EMVCo 3DS 2.x spec:

| Outcome | Customer experience | Liability |
|---|---|---|
| **Frictionless** | No challenge; issuer authenticates based on risk signals | Shifts to issuer (in many regions) |
| **Challenge** | Customer prompted (SMS, biometric, app) | Shifts to issuer on success |
| **Not applicable** | 3DS not invoked (non-EU; merchant-initiated) | Stays with merchant |

The merchant's job: send all available data to the gateway; the
gateway + issuer + 3DS server decide the flow.

## SCA under PSD2

Per [European Banking Authority RTS on SCA](https://www.eba.europa.eu/regulation-and-policy/payment-services-and-electronic-money/regulatory-technical-standards-on-strong-customer-authentication-and-secure-communication-under-psd2):
since September 2019 (enforcement gradual through 2021), EU
card payments require **two of**:

- Something you know (password / PIN)
- Something you have (phone / hardware token)
- Something you are (biometric)

Exemptions: low-value (< €30), recurring, trusted-beneficiary,
merchant-initiated. Each exemption has tracking requirements.

## Per-gateway test cards

### Stripe

Per [stripe.com/docs/testing#regulatory-cards](https://docs.stripe.com/testing#regulatory-cards):

| Card | Behaviour |
|---|---|
| 4000 0027 6000 3184 | Authentication required (challenge) |
| 4000 0025 0000 3155 | Authentication required (challenge), payment failure after success |
| 4000 0000 0000 3220 | Authentication required (challenge), payment success |
| 4000 0000 0000 3055 | 3DS supported but not required (frictionless) |
| 4242 4242 4242 4242 | Standard test card (no 3DS) |

### Adyen

Per [docs.adyen.com/development-resources/testing/3d-secure](https://docs.adyen.com/development-resources/testing/3d-secure-test-cards/):

| Card | Behaviour |
|---|---|
| 4917 6100 0000 0000 | 3DS 2 challenge flow |
| 5454 5454 5454 5454 | 3DS 2 frictionless |
| 4012 8888 8888 1881 | 3DS 1 (deprecated; for migration testing) |

### Braintree

Per [developer.paypal.com/braintree/docs/guides/3d-secure/testing-go-live](https://developer.paypal.com/braintree/docs/guides/3d-secure/testing-go-live):

| Card | Behaviour |
|---|---|
| 4000 0000 0000 1091 | Authenticate via standard flow |
| 4000 0000 0000 1109 | Frictionless |
| 4000 0000 0000 1125 | Bypass (skipped) |

## Test flow surface

```
1. Merchant calls Authorize / PaymentIntent / Charge
2. Gateway returns "requires_action" / "RedirectShopper" / "PAYER_ACTION_REQUIRED"
   per payment-flow-states-reference
3. Frontend redirects user to issuer-hosted 3DS challenge
4. User completes challenge (or auto-completes for frictionless)
5. Redirect back to merchant return URL
6. Merchant confirms PaymentIntent (or equivalent)
7. Gateway returns final state (succeeded / failed)
```

Test surface per step:

| Step | Test |
|---|---|
| 1 | Initiate with each test card; assert state |
| 2 | Frontend handles each gateway's "requires action" key correctly |
| 3 | Redirect URL is built with the gateway-provided client secret / token |
| 4 | Issuer-hosted page is reachable (manual + Playwright e2e) |
| 5 | Return URL handler parses the response correctly |
| 6 | Confirm call is idempotent (per [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md)) |
| 7 | Final state matches expected per test card |

## Frictionless vs challenge - testable assertions

```typescript
test('frictionless authentication', async () => {
  // Card 4000 0000 0000 3055 in Stripe test mode
  const intent = await stripe.paymentIntents.create({
    amount: 1000, currency: 'eur',
    payment_method: 'pm_card_threeDSecure2Supported',
    confirm: true,
  });
  expect(intent.status).toBe('succeeded');  // No challenge needed
});

test('challenge flow', async () => {
  // Card 4000 0027 6000 3184
  const intent = await stripe.paymentIntents.create({
    amount: 1000, currency: 'eur',
    payment_method: 'pm_card_threeDSecure2Required',
    confirm: true,
    return_url: 'https://example.com/return',
  });
  expect(intent.status).toBe('requires_action');
  expect(intent.next_action.type).toBe('redirect_to_url');
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip 3DS in tests | EU regulations require it; you'll discover broken at launch | Per-gateway 3DS card battery |
| Test only happy path | Challenge failure path also matters | Test failure + cancel mid-challenge |
| No return-URL handler test | Race conditions on redirect-back lost | Test the full round-trip |
| Hardcoded redirect URL in production code | Localhost in prod | Per-environment config |
| Treat `requires_action` as failure | It's the normal mid-flow state | Handle explicitly |
| 3DS 1 still in code paths | Deprecated since 2022 | Remove and test |
| One test for all gateways | Each handles 3DS slightly differently | Per-gateway |
| Sync expectation on async flow | Confirm is async | Wait for webhook |

## Limitations

- **EMVCo 3DS spec is paywalled.** Reference by stable ID; rely
  on gateway docs for test cards.
- **Issuer-hosted challenge UIs vary.** Bank-specific design;
  test via e2e against gateway test mode.
- **SCA exemptions are policy + technical.** Code must claim
  the right exemption + log the decision.
- **3DS data fields are extensive.** Each gateway has its own
  field names; per-gateway docs are authoritative.

## References

- EMVCo 3-D Secure (paywalled; cite by stable ID):
  [emvco.com/specifications/](https://www.emvco.com/specifications/).
- Stripe 3DS test cards:
  [docs.stripe.com/testing#regulatory-cards](https://docs.stripe.com/testing#regulatory-cards).
- Adyen 3DS test cards:
  [docs.adyen.com/development-resources/testing/3d-secure-test-cards/](https://docs.adyen.com/development-resources/testing/3d-secure-test-cards/).
- Braintree 3DS testing:
  [developer.paypal.com/braintree/docs/guides/3d-secure/testing-go-live](https://developer.paypal.com/braintree/docs/guides/3d-secure/testing-go-live).
- EBA RTS on SCA:
  [eba.europa.eu/regulation-and-policy/payment-services-and-electronic-money/regulatory-technical-standards-on-strong-customer-authentication-and-secure-communication-under-psd2](https://www.eba.europa.eu/regulation-and-policy/payment-services-and-electronic-money/regulatory-technical-standards-on-strong-customer-authentication-and-secure-communication-under-psd2).
- Companion catalogs:
  [`payment-flow-states-reference`](../payment-flow-states-reference/SKILL.md),
  [`pci-dss-scope-reference`](../pci-dss-scope-reference/SKILL.md).
- Consumed by:
  [`stripe-test-cards-and-webhooks`](../stripe-test-cards-and-webhooks/SKILL.md),
  [`adyen-test-mode`](../adyen-test-mode/SKILL.md),
  [`braintree-test-cards`](../braintree-test-cards/SKILL.md).
