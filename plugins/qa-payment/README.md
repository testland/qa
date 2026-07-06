# qa-payment

Payment platform sandbox testing: Stripe test cards + webhooks, Adyen test mode, PayPal sandbox, Braintree test cards; 3DS test flow + PCI DSS scope + payment flow states references; refund + chargeback + webhook-replay builders. Distinct from qa-compliance/pci-dss-scope-checker (compliance / scope verification); this plugin is platform-specific sandbox testing + payment flow state matrices.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [stripe-test-cards-and-webhooks](skills/stripe-test-cards-and-webhooks/SKILL.md) | Stripe test-mode: canonical test cards + webhook signing and replay. |
| Skill | [adyen-test-mode](skills/adyen-test-mode/SKILL.md) | Adyen test-mode API keys, canonical test cards, and 3DS flows. |
| Skill | [paypal-sandbox](skills/paypal-sandbox/SKILL.md) | PayPal Sandbox accounts + Orders v2 create / capture / refund. |
| Skill | [braintree-test-cards](skills/braintree-test-cards/SKILL.md) | Braintree sandbox: Drop-in / Hosted Fields + Transaction lifecycle. |
| Skill | [3ds-test-flow-reference](skills/3ds-test-flow-reference/SKILL.md) | Pure reference: EMVCo 3DS 2.x frictionless and challenge flows. |
| Skill | [pci-dss-scope-reference](skills/pci-dss-scope-reference/SKILL.md) | Pure reference: PCI DSS v4.0 scope reduction + SAQ levels. |
| Skill | [payment-flow-states-reference](skills/payment-flow-states-reference/SKILL.md) | Pure reference: payment lifecycle state machines across gateways. |
| Skill | [refund-test-matrix-builder](skills/refund-test-matrix-builder/SKILL.md) | Build-an-X refund test matrix (full / partial / multiple / idempotency). |
| Skill | [chargeback-flow-test-author](skills/chargeback-flow-test-author/SKILL.md) | Build-an-X chargeback / dispute test suite (Visa reason codes). |
| Skill | [payment-webhook-replay](skills/payment-webhook-replay/SKILL.md) | Build-an-X webhook replay + recovery tests (idempotency contract). |
| Agent | [payment-flow-critic](agents/payment-flow-critic.md) | Adversarial read-only reviewer: flags missing idempotency keys, unverified webhook signatures, PAN/CVV in logs, unhandled requires_action/3DS states, and double-charge race risk. Emits per-finding severity + BLOCK/PASS verdict. |
| Skill | [subscription-billing-test-author](skills/subscription-billing-test-author/SKILL.md) | Tests recurring-billing flows: trials, proration, dunning, cancel/reactivate, via Stripe Billing test clocks. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-payment@testland-qa
```
