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
| Skill | [payment-webhook-replay-skill](skills/payment-webhook-replay-skill/SKILL.md) | Build-an-X webhook replay + recovery tests (idempotency contract). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-payment@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
