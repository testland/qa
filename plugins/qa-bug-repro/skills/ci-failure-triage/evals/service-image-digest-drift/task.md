# Integration jobs can't authenticate to the database since Tuesday

## Problem Description

Every integration job has failed in global setup since Tuesday morning with
`password authentication failed for user "app"`. The obvious explanation was a
rotated secret, so we went there first: the platform team confirmed
`CI_DB_PASSWORD` has not been changed in four months, the value in the secret
store still matches what is in the password manager, and re-saving the secret
changed nothing. Two of us have now spent a day on credentials.

The other theory in the thread is the database migration that merged Monday
evening, because it is the only application change anywhere near the window and
it touches the schema. Someone has already asked the data team to revert it.

We have the failing job log, an excerpt of the last green job, and the change
log for the window. Before the revert goes in, we want a written call on what
this failure actually is and who can act on it.

## Output Specification

Produce `triage-integration-4791.md` containing:

1. What kind of failure this is and which team or role owns the next action.
2. The evidence from the attached files that supports it, quoting the specific
   lines and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. The next action, stated concretely enough to hand over.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: writing the fix, editing the workflow, editing migrations, or
producing a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/integration-4791.log ===============
2026-08-11T09:11:47Z ##[group]Initialize containers
2026-08-11T09:11:47Z Starting service container "db"
2026-08-11T09:11:47Z /usr/bin/docker pull ghcr.io/acme/ci-postgres:16
2026-08-11T09:11:52Z 16: Pulling from acme/ci-postgres
2026-08-11T09:11:58Z Digest: sha256:9f4ad0c1e7b2f83c11d0a4e6bb27c9f1a3d85e0c6741bb2e9a70cf3d51e88b04
2026-08-11T09:11:58Z Status: Downloaded newer image for ghcr.io/acme/ci-postgres:16
2026-08-11T09:11:59Z /usr/bin/docker create --name db_1 --label acme --network github_network_a1 -p 5432:5432 -e POSTGRES_DB=app_test ghcr.io/acme/ci-postgres:16
2026-08-11T09:12:00Z ##[endgroup]
2026-08-11T09:12:00Z ##[group]Service container db logs
2026-08-11T09:12:01Z db_1  | The files belonging to this database system will be owned by user "postgres".
2026-08-11T09:12:02Z db_1  | 2026-08-11 09:12:02.114 UTC [1] LOG:  starting PostgreSQL 16.9 (Debian 16.9-1.pgdg120+1)
2026-08-11T09:12:02Z db_1  | [ci-postgres image 16-4] running /docker-entrypoint-initdb.d/10-extensions.sql
2026-08-11T09:12:03Z db_1  | [ci-postgres image 16-4] running /docker-entrypoint-initdb.d/20-roles.sql
2026-08-11T09:12:03Z db_1  | NOTICE:  role "app" does not exist, creating
2026-08-11T09:12:03Z db_1  | [ci-postgres image 16-4] NOTE: from image tag 16-4 the "app" role password is read from CI_DB_PASSWORD in the container environment; earlier tags baked the shared development password into 20-roles.sql
2026-08-11T09:12:03Z db_1  | WARNING: CI_DB_PASSWORD is unset in this container; falling back to a random 32-byte password
2026-08-11T09:12:04Z db_1  | 2026-08-11 09:12:04.881 UTC [1] LOG:  database system is ready to accept connections
2026-08-11T09:12:04Z ##[endgroup]
2026-08-11T09:12:05Z ##[group]Run npm run test:integration
2026-08-11T09:12:19Z > acme-api@3.14.0 test:integration
2026-08-11T09:12:19Z > vitest run --config vitest.integration.config.ts
2026-08-11T09:12:24Z
2026-08-11T09:12:24Z  FAIL  tests/integration/globalSetup.ts [ globalSetup ]
2026-08-11T09:12:24Z error: password authentication failed for user "app"
2026-08-11T09:12:24Z     at Parser.parseErrorMessage (node_modules/pg-protocol/src/parser.ts:369:69)
2026-08-11T09:12:24Z     at Socket.<anonymous> (node_modules/pg/lib/connection.js:117:12)
2026-08-11T09:12:24Z   Serialized Error: {
2026-08-11T09:12:24Z     "code": "28P01",
2026-08-11T09:12:24Z     "severity": "FATAL",
2026-08-11T09:12:24Z     "routine": "auth_failed",
2026-08-11T09:12:24Z     "connection": "postgresql://app@127.0.0.1:5432/app_test"
2026-08-11T09:12:24Z   }
2026-08-11T09:12:24Z
2026-08-11T09:12:24Z  Test Files  0 passed (0)
2026-08-11T09:12:24Z       Tests  no tests
2026-08-11T09:12:24Z Errors  1 error
2026-08-11T09:12:25Z ##[error]Process completed with exit code 1.

=============== FILE: logs/last-green-4770-excerpt.log ===============
2026-08-10T09:10:33Z ##[group]Initialize containers
2026-08-10T09:10:33Z Starting service container "db"
2026-08-10T09:10:33Z /usr/bin/docker pull ghcr.io/acme/ci-postgres:16
2026-08-10T09:10:39Z Digest: sha256:2c9e5b7708aa41d6ef03bb90c4d5127ee6b0a4419d3f8c2a5ad61be7d0c381bd
2026-08-10T09:10:39Z Status: Downloaded newer image for ghcr.io/acme/ci-postgres:16
2026-08-10T09:10:41Z db_1  | 2026-08-10 09:10:41.502 UTC [1] LOG:  starting PostgreSQL 16.4 (Debian 16.4-1.pgdg120+1)
2026-08-10T09:10:41Z db_1  | [ci-postgres image 16-2] running /docker-entrypoint-initdb.d/20-roles.sql
2026-08-10T09:10:42Z db_1  | 2026-08-10 09:10:42.700 UTC [1] LOG:  database system is ready to accept connections
2026-08-10T09:10:55Z  Test Files  38 passed (38)
2026-08-10T09:10:55Z       Tests  511 passed (511)
2026-08-10T09:11:02Z ##[error]none - job succeeded

=============== FILE: ci/window-notes.md ===============
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
