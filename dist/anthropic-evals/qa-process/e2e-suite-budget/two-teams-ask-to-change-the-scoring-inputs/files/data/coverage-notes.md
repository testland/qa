# Paths with only one end-to-end test covering them - checked 2026-09-05

| Path                          | Sole cover                                     |
|-------------------------------|------------------------------------------------|
| `/checkout/refund`             | `orders.spec.ts > refund-to-original-method`   |
| `/auth/sso`                    | `auth.spec.ts > sso-redirect`                  |
| `/account/export`              | `account.spec.ts > data-export-request`        |
| `/admin/import`                | `admin.spec.ts > bulk-import-10k-rows`         |
| `/promo/seasonal`              | `promo.spec.ts > seasonal-banner`              |
| `/reports/export`              | `reports.spec.ts > export-50k-rows`            |

Everything else in the suite shares its path with at least one other test.
`notifications.spec.ts > in-app-toast` asserts a toast component on
`/dashboard`, which five other tests exercise.
