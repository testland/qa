# dispatch-api - CI job wall clock, week 37 (median of 22 runs on main)

| Job          | Command                | Trigger      | Wall clock | Workers |
|--------------|------------------------|--------------|-----------:|--------:|
| unit         | `node --test test/unit`        | pull request |    14m 06s |       1 |
| integration  | `node --test test/integration` | pull request |     2m 10s |       1 |
| e2e          | `node --test test/e2e`         | pull request |     9m 40s |       4 |
| e2e-nightly  | `npm run test:nightly`         | 02:00 daily  |    21m 30s |       1 |

Notes pulled from the pipeline config:

- The `unit` job declares `services: [postgres, chromium]` and exports
  `DATABASE_URL` and `E2E_BASE_URL` into the job environment. It has done since
  the 2024 pipeline rewrite.
- The `integration` job is the only one that finishes under five minutes.
- `e2e-nightly` runs against staging on a schedule, not on pull requests.
- Retries are off on all four jobs.
