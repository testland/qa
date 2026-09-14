# Release risk register - platform

**Last reviewed:** 2026-02-04   **Owner:** Marcus Oyelaran   **Reviewers:** Anna Reyes, Priya Nandakumar

Scoring is impact 1-5 by likelihood 1-5. Block threshold is 15.

| ID   | Risk                                          | Category    | Source paths                  | Impact | Likelihood | Score | Mitigation                   | Owner   | Last review |
|------|-----------------------------------------------|-------------|-------------------------------|-------:|-----------:|------:|------------------------------|---------|-------------|
| R-01 | Checkout promo rounding wrong                 | Business    | services/promo                |   5    |     3      |  15   | Property tests on rounding   | Marcus  | 2026-02-04  |
| R-02 | payments-provider-fallback path never works   | Technical   | services/payments/fallback    |   5    |     4      |  20   | Weekly chaos drill in stage  | Dana    | 2026-02-04  |
| R-04 | legacy-tax-import mis-files EU VAT            | Regulatory  | services/tax/legacy_import    |   5    |     3      |  15   | Quarterly finance UAT        | Marcus  | 2026-02-04  |
| R-07 | inventory-cache serves stale stock            | Technical   | services/inventory/cache      |   3    |     2      |   6   | TTL alert in Datadog         | Dana    | 2026-02-04  |
| R-09 | partner-sftp-drop loses the nightly file      | Integration | services/partners/sftp        |   4    |     4      |  16   | Retry plus on-call alert     | Sofia   | 2026-02-04  |
| R-11 | admin-audit-log gaps break the audit trail    | Regulatory  | services/admin/audit          |   4    |     3      |  12   | Append-only store            | Sofia   | 2026-02-04  |
| R-13 | Catalog import drops SKUs over 10k rows       | Business    | services/catalog/import       |   3    |     3      |   9   | Nightly reconciliation job   | Marcus  | 2026-02-04  |

Rows R-03, R-05, R-06, R-08, R-10, R-12 were retired in the 2026-01 review and are
kept in `docs/risk/retired.md`.
