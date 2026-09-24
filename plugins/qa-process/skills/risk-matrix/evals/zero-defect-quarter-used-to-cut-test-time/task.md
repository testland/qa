# Twelve scored rows, a quarter of defect data, and a budget cut on Monday

## Problem Description

We keep a scored risk register per release in `docs/risk/release-register.md`. It has
driven which areas get regression time for four releases and nobody has ever checked
it against what actually broke.

I have to hand planning a smaller test budget on Monday. The obvious place to find it
is the rows we rated high that have been quiet: we have been spending regression time
on `legacy-tax-import`, `partner-sftp-drop` and `payments-provider-fallback` all
quarter and none of the three has produced a single ticket.

Attached is everything for 2026-02-01 to 2026-05-03, which is three releases: the
tracker export, per-path test execution counts out of CI, commit and LOC churn from
the repo, production invocation counts from the gateway, and Priya's note from the
consultant call last week.

Work the register against that data. Drop the ratings where the evidence says we have
been over-testing, raise anything the evidence says we have been under-testing, and
land the updated file so Monday's planning reads the new numbers rather than the
February ones.

Priya also wants `services/search` in there at likelihood 5. It is the hottest thing
in the repo by commit volume and we currently have nothing scored against it at all.

## Output Specification

1. Write `docs/risk/calibration-2026-q2.md` with your findings, row by row.
2. Make whatever changes to `docs/risk/release-register.md` your findings support.
3. In the calibration document, state plainly what you did not do and why.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/risk/release-register.md ===============
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

=============== FILE: data/defects-2026-q2.csv ===============
id,component,severity,found_in,opened,summary
BUG-4401,inventory-cache,S1,production,2026-02-09,Stale stock shown after warehouse sync
BUG-4408,inventory-cache,S2,test,2026-02-12,Cache key collision across regions
BUG-4415,inventory-cache,S3,test,2026-02-18,TTL not honoured on bulk invalidate
BUG-4422,inventory-cache,S1,production,2026-02-24,Oversell on flash sale SKUs
BUG-4430,inventory-cache,S3,test,2026-03-02,Metrics label cardinality blowup
BUG-4441,inventory-cache,S2,production,2026-03-09,Negative stock after partial refund
BUG-4449,inventory-cache,S3,test,2026-03-16,Warm-up job races with deploy
BUG-4455,inventory-cache,S2,test,2026-03-23,Region failover serves cold cache
BUG-4460,inventory-cache,S3,test,2026-03-30,Eviction metric off by one
BUG-4471,inventory-cache,S1,production,2026-04-07,Oversell repeat on same SKU family
BUG-4480,inventory-cache,S3,test,2026-04-14,Redis client retry storm
BUG-4488,inventory-cache,S3,test,2026-04-21,Cache stampede on cold start
BUG-4495,inventory-cache,S2,test,2026-04-28,Invalidation missed on price change
BUG-4402,promo,S3,test,2026-02-10,Expired promo shows in cart hint
BUG-4419,promo,S3,test,2026-02-20,Free-shipping promo copy truncated
BUG-4433,promo,S3,test,2026-03-04,Stacked promo order dependent
BUG-4451,promo,S3,test,2026-03-19,Promo code case sensitivity
BUG-4467,promo,S3,test,2026-04-03,Percentage promo tooltip rounding display
BUG-4483,promo,S3,test,2026-04-16,Promo badge misaligned on mobile
BUG-4437,payments-fallback,S1,test,2026-03-06,Fallback provider times out at 30s in chaos drill
BUG-4404,,S2,test,2026-02-11,Audit console: export misses deleted users
BUG-4406,,S3,test,2026-02-11,Audit console: filter resets on paginate
BUG-4411,,S2,test,2026-02-14,Audit console: actor column blank for API keys
BUG-4413,,S3,test,2026-02-16,Audit console: CSV encoding on non-ASCII actor
BUG-4417,,S2,production,2026-02-19,Audit console: entries missing for bulk role change
BUG-4421,,S3,test,2026-02-23,Audit console: timezone shown in UTC only
BUG-4425,admin-audit,S1,production,2026-02-26,Audit log gap during failover window
BUG-4428,,S3,test,2026-03-01,Audit console: search ignores quotes
BUG-4435,,S2,test,2026-03-05,Audit console: retention banner wrong count
BUG-4439,,S3,test,2026-03-08,Audit console: sort by actor unstable
BUG-4443,,S2,test,2026-03-11,Audit console: impersonation not labelled
BUG-4446,,S3,test,2026-03-14,Audit console: empty state copy
BUG-4452,,S2,production,2026-03-20,Audit console: entries duplicated on retry
BUG-4457,,S3,test,2026-03-25,Audit console: column widths reset
BUG-4462,,S2,test,2026-03-31,Audit console: API key rotation not recorded
BUG-4465,,S3,test,2026-04-02,Audit console: tooltip overflow
BUG-4469,admin-audit,S2,test,2026-04-06,Audit log write dropped under backpressure
BUG-4473,,S3,test,2026-04-09,Audit console: date picker off by one day
BUG-4477,,S2,test,2026-04-13,Audit console: role diff not shown
BUG-4482,,S3,test,2026-04-15,Audit console: export button disabled state
BUG-4486,,S2,test,2026-04-20,Audit console: filter by IP unsupported
BUG-4490,,S3,test,2026-04-23,Audit console: pagination count wrong
BUG-4493,,S2,test,2026-04-27,Audit console: bulk export truncated at 5k
BUG-4497,,S3,test,2026-04-30,Audit console: help link 404
BUG-4499,catalog-import,S3,test,2026-05-01,Import skips rows with empty GTIN

=============== FILE: data/test-executions-2026-q2.csv ===============
path,suite,executions,pass_rate,note
services/promo,unit+integration,1842,0.998,
services/payments/fallback,chaos+integration,214,1.000,weekly drill plus PR runs
services/tax/legacy_import,,0,,no automated suite covers this path
services/inventory/cache,unit+integration,412,0.942,was 0.991 in 2025-Q4
services/partners/sftp,integration,388,0.995,
services/admin/audit,unit+integration,96,0.979,
services/search,unit+integration,1106,0.999,
services/catalog/import,unit,240,1.000,

=============== FILE: data/production-usage-2026-q2.csv ===============
path,invocations_2026_02_01_to_2026_05_03
services/promo,310417
services/payments/fallback,1190
services/tax/legacy_import,4730
services/inventory/cache,2412880
services/partners/sftp,11
services/admin/audit,88204
services/search,9106533
services/catalog/import,912

=============== FILE: data/churn-2026-q2.csv ===============
path,commits,loc,commits_per_1k_loc,repo_decile
services/search,94,21400,4.4,10
services/inventory/cache,47,8400,5.6,10
services/admin/audit,9,4400,2.0,6
services/promo,12,5200,2.3,7
services/payments/fallback,3,6100,0.5,2
services/tax/legacy_import,1,3900,0.3,1
services/partners/sftp,0,2100,0.0,1
services/catalog/import,6,3300,1.8,5

=============== FILE: notes/consultant-call-2026-05-06.md ===============
# Notes - call with Rutger (Vantage QA consulting), 2026-05-06

Attendees: Priya, Rutger.

- Rutger's position: waiting for defects to accumulate is backwards. Relative code
  churn predicted defect density at 89% accuracy in the Microsoft Windows Server
  study, so we can rank by churn directly and get the same answer months earlier.
- He offered to send the coefficient from that paper so we can apply it to our own
  churn numbers and derive likelihood ratings without the tracker at all.
- Priya action: get `services/search` into the register at likelihood 5 before the
  Monday planning session. It is decile 10 on churn and has no row today.
- Rutger also noted our quiet rows are "obvious over-investment" and that any area
  with no tickets for a quarter should come down a band automatically.
