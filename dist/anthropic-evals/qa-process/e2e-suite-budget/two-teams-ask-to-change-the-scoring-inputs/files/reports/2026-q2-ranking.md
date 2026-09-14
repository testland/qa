# Q2 2026 per-test ranking - published 2026-06-30

Input definitions used, unchanged since the review started in Q4 2025:

- Catches: real defects attributed to the test over the trailing **12 months**.
- Churn: PRs touching the test over the trailing **90 days**, compared against
  the suite's own median for the same window, which was 2.
- Tier: 1-5, assigned by the owning team at the start of the quarter.
- Runtime and flake: rolling four-week CI averages.

Ranked worst first. 24 tests.

| # | Test                                          | Score |
|--:|-----------------------------------------------|------:|
| 1 | `notifications.spec.ts > in-app-toast`         | 0.00 |
| 2 | `promo.spec.ts > seasonal-banner`              | 0.00 |
| 3 | `orders.spec.ts > refund-to-original-method`   | 0.10 |
| 4 | `reports.spec.ts > export-50k-rows`            | 0.28 |
| 5 | `admin.spec.ts > audit-log-download`           | 0.39 |
| 6 | `reports.spec.ts > scheduled-email-report`     | 0.41 |
| 7 | `search.spec.ts > empty-state-copy`            | 0.43 |
| 8 | `admin.spec.ts > bulk-import-10k-rows`         | 0.60 |
| 9 | `auth.spec.ts > password-reset-email`          | 0.66 |
|10 | `auth.spec.ts > sso-redirect`                  | 0.76 |
|11 | `search.spec.ts > facet-filters`               | 0.79 |
|12 | `account.spec.ts > data-export-request`        | 0.87 |
|13 | `checkout.spec.ts > apply-discount-code`       | 0.87 |
|14 | `pricing.spec.ts > currency-switch`            | 0.95 |
|15 | `admin.spec.ts > user-role-change`             | 0.97 |
|16 | `settings.spec.ts > api-key-rotation`          | 1.22 |
|17 | `cart.spec.ts > persist-cart-across-sessions`  | 1.63 |
|18 | `account.spec.ts > change-password`            | 1.63 |
|19 | `cart.spec.ts > line-item-edit`                | 1.89 |
|20 | `checkout.spec.ts > saved-card-purchase`       | 2.09 |
|21 | `checkout.spec.ts > card-purchase-happy-path`  | 2.58 |
|22 | `orders.spec.ts > cancel-within-window`        | 2.59 |
|23 | `search.spec.ts > keyword-results`             | 2.96 |
|24 | `auth.spec.ts > login-with-password`           | 9.90 |
