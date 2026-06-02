# qa-payment

Payment platform sandbox testing: Stripe test cards + webhooks, Adyen test mode, PayPal sandbox, Braintree test cards; 3DS test flow + PCI DSS scope + payment flow states references; refund + chargeback + webhook-replay builders. Distinct from qa-compliance/pci-dss-scope-checker (compliance / scope verification); this plugin is platform-specific sandbox testing + payment flow state matrices.

## Components

| Type | Name | Description |
| --- | --- | --- |
| (filled in as components are added) |  |  |

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
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
