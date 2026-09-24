# pilot/automation - CI run history

Nine specs across three files. The job runs `npx playwright test` on every
push to the branch. Committed config: chromium only, `retries: 0`.

| Run | Date       | Result | Detail |
|-----|------------|--------|--------|
| 806 | 2026-08-24 | pass   | 9 passed, 3m41s |
| 809 | 2026-08-25 | pass   | 9 passed, 3m38s |
| 814 | 2026-08-27 | pass   | 9 passed, 3m40s |
| 817 | 2026-08-28 | pass   | 9 passed, 3m44s |
| 821 | 2026-09-01 | fail   | 1m06s. `console: the plan badge reads the current plan` - expected "Starter", received "Scale" |
| 824 | 2026-09-02 | pass   | 9 passed, 1m04s |
| 827 | 2026-09-02 | fail   | 1m05s. `console: the dashboard shows the account credit` - expected "5,000.00", received "4,981.50" |
| 830 | 2026-09-03 | fail   | 1m07s. `quoting: the starter tier price applies to a mid-band parcel` - expected "18.50", received "14.80"; `console: the plan badge reads the current plan` - expected "Starter", received "Scale" |
| 833 | 2026-09-04 | pass   | 9 passed, 1m03s |
| 836 | 2026-09-05 | fail   | 1m08s. `billing: an upgrade is listed on the billing history` - expected 2 rows, received 3 |
| 839 | 2026-09-08 | fail   | 1m05s. `console: the dashboard shows the account credit` - expected "5,000.00", received "4,985.20" |
| 842 | 2026-09-09 | error  | job cancelled at 0m12s, runner lost. No tests started and no results reported. Re-queued by hand; run 843 passed. |
| 845 | 2026-09-10 | pass   | 9 passed, 1m02s |
| 848 | 2026-09-11 | fail   | 1m06s. `console: the plan badge reads the current plan` - expected "Starter", received "Scale"; `console: the dashboard shows the account credit` - expected "5,000.00", received "4,981.50" |

Every failing run above was re-run by hand within the hour and passed on the
re-run. Nothing in these failures has ever reproduced on a laptop.
