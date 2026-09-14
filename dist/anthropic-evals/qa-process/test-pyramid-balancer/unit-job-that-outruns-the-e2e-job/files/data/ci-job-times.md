# dispatch-api - CI job wall clock, week 37 (median of 22 runs on main)

| Job         | Command                        | Wall clock | Workers | Services declared     |
|-------------|--------------------------------|-----------:|--------:|-----------------------|
| unit        | `node --test test/unit`        |    14m 06s |       1 | postgres:16, chromium |
| integration | `node --test test/integration` |     2m 10s |       1 | postgres:16, carrier-stub |
| e2e         | `node --test test/e2e`         |     9m 40s |       4 | postgres:16, chromium, full stack |

Notes pulled from the pipeline config and the last run's timing breakdown:

- The `unit` job declares `services: [postgres, chromium]` and exports
  `DATABASE_URL` and `E2E_BASE_URL` into the job environment. It has done since
  the 2024 pipeline rewrite. Nobody currently on the team wrote that line.
- Of the unit job's 14m 06s, 11m 12s is spent inside four spec files. The
  remaining 2m 54s covers everything else under `test/unit/`.
- The `integration` job is the only one that finishes under five minutes.
- Retries are off on all three jobs.
