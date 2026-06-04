# qa-test-environment

Test environment management: containerized backing services (Testcontainers + docker-compose), per-test database snapshot/restore via Postgres template DBs, an OpenFeature-driven feature-flag matrix harness, and a Playwright fixture builder. Composes with `parallel-isolation-checker` in [`qa-flake-triage`](../qa-flake-triage/) for shared-state diagnosis.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [docker-compose-test](skills/docker-compose-test/SKILL.md) | Authors a `compose.test.yaml` for tests - declares the SUT plus its real backing services as one declarative topology, wires healthcheck-... |
| Skill | [feature-flag-test-harness](skills/feature-flag-test-harness/SKILL.md) | Builds a test harness that runs the same suite under every relevant flag combination - picks the minimum cover (single flags + pairwise i... |
| Skill | [playwright-fixture-builder](skills/playwright-fixture-builder/SKILL.md) | Builds reusable Playwright fixtures via `test.extend` - picks the right scope (test vs worker), wires the `use(value)` setup/teardown spl... |
| Skill | [testcontainers](skills/testcontainers/SKILL.md) | Brings up real backing services (databases, message brokers, browsers, anything dockerizable) as throwaway containers from inside a test... |
| Agent | [db-snapshot-restore](agents/db-snapshot-restore.md) | Action-taking agent that gives integration tests a clean database between cases - captures a baseline `snapshot` once (template DB for Po... |
| Agent | [test-environment-bootstrapper](agents/test-environment-bootstrapper.md) | Wires a full integration/E2E test environment from scratch for a greenfield service - spins up containers (Testcontainers or Docker Compo... |

### Cross-plugin reference

| Type | Name | Lives in | Description |
|---|---|---|---|
| Agent | [parallel-isolation-checker](../qa-flake-triage/agents/parallel-isolation-checker.md) | `qa-flake-triage` | Read-only investigator that finds the shared state two parallel workers are stepping on (DB rows, env vars, files, ports, lockfiles, module state). Install `qa-flake-triage` to use it; it composes naturally with this plugin's `db-snapshot-restore` and Playwright fixtures. |

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
