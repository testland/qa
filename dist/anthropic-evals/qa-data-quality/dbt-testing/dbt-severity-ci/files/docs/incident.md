# 2026-11-12 orphaned orders

The customer sync broke and 4,312 orders had no matching customer. `dbt build` in CI was green
and `ci/check_results.py` printed "dbt OK", so the release went out.

What we want: a handful of orphans stays a warning, more than 100 blocks the release. Whoever
investigates should be able to see the offending rows without rewriting the test SQL.
