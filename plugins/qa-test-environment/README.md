# qa-test-environment

Test environment management: containerized backing services (Testcontainers + docker-compose), per-test database snapshot/restore via Postgres template DBs, an OpenFeature-driven feature-flag matrix harness, and a Playwright fixture builder. Composes with `parallel-isolation-checker` in [`qa-flake-triage`](../qa-flake-triage/) for shared-state diagnosis.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [testcontainers](skills/testcontainers/SKILL.md) | S1 | Per-test throwaway container dependencies (Postgres / Redis / Kafka / Selenium / etc.) via the Testcontainers library family across Java, Node, Python, Go, .NET, Ruby. Wait strategies, network aliases, Ryuk cleanup, optional `withReuse` for local dev. |
| skill | [docker-compose-test](skills/docker-compose-test/SKILL.md) | S1 | `compose.test.yaml` for multi-service test topology. Healthcheck-driven `depends_on: condition: service_healthy`, per-CI-job isolation via `COMPOSE_PROJECT_NAME`, gating on `--wait` / `--exit-code-from`, deterministic `down --volumes --remove-orphans`. |
| skill | [feature-flag-test-harness](skills/feature-flag-test-harness/SKILL.md) | S3 | Build-an-X workflow that runs the suite once per relevant flag combination — author-declared interaction tuples (not 2^N), OpenFeature in-memory provider, GitHub Actions matrix shards, aggregated pass/fail matrix. |
| skill | [playwright-fixture-builder](skills/playwright-fixture-builder/SKILL.md) | S3 | Build-an-X workflow for `fixtures.ts` — picks scope (test vs worker), wires `use()` setup/teardown, composes auth (storageState per worker via `workerInfo.workerIndex`), DB (auto-fixture restore), and feature-flag fixtures. |
| agent | [db-snapshot-restore](agents/db-snapshot-restore.md) | A2 | Action-taking agent: `snapshot` baseline (Postgres template DB / mysqldump / mongodump), `restore` between tests, `wrap` per-test in BEGIN/ROLLBACK when ORM cooperates. Refuses against production-shaped DB names. |

### Cross-plugin reference

| Type | Name | Lives in | Description |
|---|---|---|---|
| agent | [parallel-isolation-checker](../qa-flake-triage/agents/parallel-isolation-checker.md) | `qa-flake-triage` | Read-only investigator that finds the shared state two parallel workers are stepping on (DB rows, env vars, files, ports, lockfiles, module state). Install `qa-flake-triage` to use it; it composes naturally with this plugin's `db-snapshot-restore` and Playwright fixtures. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-environment@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
