# qa-test-environment

Test environment management: containerized backing services (Testcontainers + docker-compose), per-test database snapshot/restore via Postgres template DBs, an OpenFeature-driven feature-flag matrix harness, and a Playwright fixture builder. Composes with `parallel-isolation-checker` in [`qa-flake-triage`](../qa-flake-triage/) for shared-state diagnosis.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [testcontainers](skills/testcontainers/SKILL.md) | Per-test throwaway container dependencies (Postgres / Redis / Kafka / Selenium / etc.) via the Testcontainers library family across Java, Node, Python, Go, .NET, Ruby. Wait strategies, network aliases, Ryuk cleanup, optional `withReuse` for local dev. |
| Skill | [docker-compose-test](skills/docker-compose-test/SKILL.md) | `compose.test.yaml` for multi-service test topology. Healthcheck-driven `depends_on: condition: service_healthy`, per-CI-job isolation via `COMPOSE_PROJECT_NAME`, gating on `--wait` / `--exit-code-from`, deterministic `down --volumes --remove-orphans`. |
| Skill | [feature-flag-test-harness](skills/feature-flag-test-harness/SKILL.md) | Build-an-X workflow that runs the suite once per relevant flag combination - author-declared interaction tuples (not 2^N), OpenFeature in-memory provider, GitHub Actions matrix shards, aggregated pass/fail matrix. |
| Skill | [playwright-fixture-builder](skills/playwright-fixture-builder/SKILL.md) | Build-an-X workflow for `fixtures.ts` - picks scope (test vs worker), wires `use()` setup/teardown, composes auth (storageState per worker via `workerInfo.workerIndex`), DB (auto-fixture restore), and feature-flag fixtures. |
| Agent | [db-snapshot-restore](agents/db-snapshot-restore.md) | Action-taking agent: `snapshot` baseline (Postgres template DB / mysqldump / mongodump), `restore` between tests, `wrap` per-test in BEGIN/ROLLBACK when ORM cooperates. Refuses against production-shaped DB names. |

### Cross-plugin reference

| Type | Name | Lives in | Description |
|---|---|---|---|
| Agent | [parallel-isolation-checker](../qa-flake-triage/agents/parallel-isolation-checker.md) | `qa-flake-triage` | Read-only investigator that finds the shared state two parallel workers are stepping on (DB rows, env vars, files, ports, lockfiles, module state). Install `qa-flake-triage` to use it; it composes naturally with this plugin's `db-snapshot-restore` and Playwright fixtures. |
| Agent | [test-environment-bootstrapper](agents/test-environment-bootstrapper.md) | Bootstraps a full integration/E2E environment: containers + DB + feature flags + Playwright fixtures. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-environment@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
