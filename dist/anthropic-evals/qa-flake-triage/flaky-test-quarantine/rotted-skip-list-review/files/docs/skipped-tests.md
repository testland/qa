# Tests currently switched off

| ID   | Test                          | Off since  | Re-check by | Times extended | Ticket | Owner |
|------|-------------------------------|------------|-------------|----------------|--------|-------|
| Q-01 | checkout applies regional tax | 2025-12-08 | 2026-03-08  | 2              | #3120  |       |
| Q-02 | search returns paged results  | 2026-07-28 | 2026-08-27  | 0              | #5501  | @search |
| Q-03 | notification digest sends     | 2026-06-01 | 2026-07-01  | 1              | #4412  | @messaging |
| Q-04 | legacy csv import parses      | 2026-03-14 |             | 0              |        |       |
| Q-05 | dashboard widgets load        | 2026-07-20 | 2026-08-10  | 1              | #5388  | @web-platform |

Notes kept by hand:

- Q-01: fails about 14% of runs, cause never found. Two people tried. The team
  that owned it (@growth) was folded into @web-platform in February.
- Q-02: fails about 7% of runs, indexer race, @search has a fix in review.
- Q-03: #4412 was closed as fixed and shipped on 2026-07-20.
- Q-04: the CSV import feature was removed from the product in the 5.2 release
  (2026-05-19). The test still exists.
- Q-05: fails about 9% of runs. #5388 is open, @web-platform started on it last
  week and expects to land something within two weeks.
