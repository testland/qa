# Quarantine register - week 36

Tests on this list are excluded from the blocking end-to-end job. They still run
on the nightly non-blocking lane, but a failure there does not stop a merge and
does not stop a release train.

| Test                                        | Out since  | Review by  | Ticket |
|---------------------------------------------|------------|------------|--------|
| `search.spec.ts > facet-filters`             | 2026-07-29 | 2026-10-31 | #4102  |
| `reports.spec.ts > export-csv-small`         | 2026-08-14 | 2026-11-15 | #4166  |
| `onboarding.spec.ts > sample-data-import`    | 2026-08-27 | 2026-11-28 | #4189  |
| `search.spec.ts > empty-state-copy`          | 2026-08-31 | 2026-11-30 | #4201  |
| `promo.spec.ts > referral-invite-flow`       | 2026-09-02 | 2026-12-02 | #4208  |

Nobody has picked any of the five up yet.
