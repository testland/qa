# orders-api deploy log (UTC)

| When             | Version | Change                                   | Result |
|------------------|---------|------------------------------------------|--------|
| 2026-05-28 14:05 | v4.7.1  | Promo endpoint rate limit                | ok     |
| 2026-06-01 09:40 | v4.7.2  | Catalogue search tuning                  | ok     |
| 2026-06-02 10:20 | v4.7.3  | Copy fix on the cancellation screen      | ok     |
| 2026-06-03 11:15 | v4.7.4  | Eircode allowlist additions              | ok     |
| 2026-06-04 09:05 | v4.7.5  | Invoice PDF footer                       | ok     |

Every deploy is a rolling restart of all four orders-api pods. Nothing was rolled
back this week.
