# Per-test score, week 36 - bottom ten of 100

Suite median score: 1.9. Window: 12 months for catches, 90 days for PR touches.

| Test                                        | Score | Runtime | Flake | Bugs caught | Tier |
|---------------------------------------------|------:|--------:|------:|------------:|-----:|
| `promo.spec.ts > seasonal-banner`            |  0.00 |   1.6m  |  19%  |      0      |  1   |
| `notifications.spec.ts > in-app-toast`       |  0.00 |   0.8m  |  11%  |      0      |  1   |
| `orders.spec.ts > print-packing-slip`        |  0.00 |   2.2m  |   5%  |      0      |  1   |
| `promo.spec.ts > referral-invite-flow`       |  0.00 |   2.5m  |  16%  |      0      |  1   |
| `search.spec.ts > empty-state-copy`          |  0.00 |   0.9m  |   3%  |      0      |  2   |
| `pricing.spec.ts > tax-line-rendering`       |  0.00 |   1.3m  |   4%  |      0      |  3   |
| `reports.spec.ts > export-50k-rows`          |  0.00 |   4.6m  |   2%  |      0      |  2   |
| `onboarding.spec.ts > first-run-checklist`   |  0.00 |   2.7m  |  14%  |      0      |  2   |
| `account.spec.ts > data-export-request`      |  0.22 |   2.9m  |   6%  |      1      |  4   |
| `checkout.spec.ts > three-d-secure-challenge`|  0.24 |   2.7m  |  11%  |      1      |  5   |
| `auth.spec.ts > sso-redirect`                |  0.28 |   2.4m  |   9%  |      1      |  5   |

Note: eleven rows because `notifications.spec.ts > in-app-toast` ties at 0.00
and the cut-off falls inside the tie.
