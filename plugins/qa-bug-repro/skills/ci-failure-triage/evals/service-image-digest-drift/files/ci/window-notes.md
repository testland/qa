## Job history, integration workflow (last 50 runs)

- Runs 4721-4770 (2026-07-22 to 2026-08-10T09:10): all green.
- Runs 4772-4791 (2026-08-10T18:55 onwards): all fail, identical error 28P01
  in `globalSetup`, no test ever executes.
- Retry of run 4791 on the same commit: same failure.
- **Re-ran the commit from run 4770** (`b39ff02`, unchanged, green on Monday
  morning) manually today at 08:40: it now fails with the same 28P01 error.
- Runner image `ubuntu-24.04 / 20260803.1.0` on every run in the window; no
  runner label change.
- No quarantine list, flake list, or skip annotation exists in this repo.

## Application changes in the window

```
$ git log --oneline --since=2026-08-08
b7c2e18 (2026-08-10 18:20) chore(db): add index on orders.created_at
4a80d3d (2026-08-10 11:02) feat(api): expose invoice PDF endpoint
b39ff02 (2026-08-08 15:44) test: split the integration setup helpers
```

```
$ git show b7c2e18 -- db/migrations/0184_orders_created_at_index.sql
+CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at
+  ON orders (created_at DESC);
```

## Platform notes

- `ghcr.io/acme/ci-postgres` is built by the platform team from an internal
  Dockerfile; the `16` tag is rebuilt whenever the base image gets a patch.
- The workflow passes `CI_DB_PASSWORD` to the `test:integration` step's `env:`
  block. The `services.db` block sets only `POSTGRES_DB`.
