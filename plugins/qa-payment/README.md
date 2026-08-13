# qa-payment

Payment platform testing: Stripe test cards + webhooks, Stripe subscription billing test clocks, the Adyen / PayPal / Braintree sandbox umbrella, the payment lifecycle state-machine + 3DS flow reference, and the refund / dispute / webhook-replay suite-authoring workflow. Distinct from qa-compliance/pci-dss-control-test-author (PCI DSS scope + control verification - the PCI scope catalog now lives there as references/pci-scope.md); this plugin is platform-specific sandbox testing + payment flow suites.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [stripe-test-cards-and-webhooks](skills/stripe-test-cards-and-webhooks/SKILL.md) | Stripe test-mode: canonical test cards + webhook signing and replay. |
| Skill | [stripe-subscription-billing-test-author](skills/stripe-subscription-billing-test-author/SKILL.md) | Tests recurring-billing flows: trials, proration, dunning, cancel/reactivate, via Stripe Billing test clocks. |
| Skill | [payment-gateway-sandboxes](skills/payment-gateway-sandboxes/SKILL.md) | Vendor-generic sandbox pattern with per-gateway references for Adyen, PayPal, and Braintree. |
| Skill | [payment-flow-states-reference](skills/payment-flow-states-reference/SKILL.md) | Pure reference: payment lifecycle state machines across gateways + EMVCo 3DS 2.x flows. |
| Skill | [payment-flow-test-author](skills/payment-flow-test-author/SKILL.md) | Build-an-X suite for refunds, chargebacks/disputes, and webhook replay via gateway-native simulators. |
| Agent | [payment-flow-critic](agents/payment-flow-critic.md) | Adversarial read-only reviewer: flags missing idempotency keys, unverified webhook signatures, PAN/CVV in logs, unhandled requires_action/3DS states, and double-charge race risk. Emits per-finding severity + BLOCK/PASS verdict. |

PCI DSS scope guidance (SAQ levels, PAN-storage rules, scope-reduction
patterns) moved to
[qa-compliance/pci-dss-control-test-author](../qa-compliance/skills/pci-dss-control-test-author/SKILL.md).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-payment@testland-qa
```
