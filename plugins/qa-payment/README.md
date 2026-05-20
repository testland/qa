# qa-payment

Payment platform sandbox testing: Stripe test cards + webhooks, Adyen test mode, PayPal sandbox, Braintree test cards; 3DS test flow + PCI DSS scope + payment flow states references; refund + chargeback + webhook-replay builders. Distinct from qa-compliance/pci-dss-scope-checker (compliance / scope verification); this plugin is platform-specific sandbox testing + payment flow state matrices.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-payment@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
