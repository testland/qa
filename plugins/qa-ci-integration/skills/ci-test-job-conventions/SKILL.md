---
name: ci-test-job-conventions
description: "Pure-reference for cross-CI test workflow conventions - when to shard (and how many shards), retry policy (which failures are safe to retry), flake quarantine integration, artifact lifecycle (retention / structure), per-trigger filtering (per-PR vs per-merge vs nightly), concurrency control patterns, JUnit reporting standards. Use as the team's reference doc for CI test workflow design across GitHub Actions / GitLab CI / Jenkins / CircleCI."
---

# ci-test-job-conventions

## Overview

Per-CI platform skills (GitHub Actions / GitLab CI / Jenkins /
CircleCI) cover **how to express** workflows. This skill covers
**what to express** - the cross-platform conventions that apply
regardless of CI tool.

## §1 - When to shard

Sharding splits a test suite across N parallel jobs. Decision
matrix:

| Suite total runtime | Sharding recommendation                       |
|---------------------|-----------------------------------------------|
| < 2 min             | None. Overhead exceeds benefit.                |
| 2-10 min            | Optional. Shard if PR feedback time matters.   |
| 10-30 min           | 2-4 shards.                                    |
| > 30 min            | 4-8 shards. Investigate the suite - may be too big. |
| > 60 min            | 8+ shards + investigate suite refactoring (per `e2e-suite-budget`). |

Sharding cost-equivalent is N parallel × ~runtime/N - same total
CPU-time, faster wall-clock.

## §2 - Retry policy

Distinguish retry classes:

| Failure class                | Retry?           | Pattern                                     |
|------------------------------|------------------|---------------------------------------------|
| Runner died / system failure | Yes (1-2x)       | CI platform's retry-on-runner-failure.    |
| Network timeout to dependency | Yes (1x)         | Test framework retry; flag for analysis.  |
| Test flake (passed on retry)  | No               | Mark + quarantine via `flaky-test-quarantine`. |
| Test consistently fails       | No               | Real bug; investigate.                      |

**Rule:** Maximum 1 framework-level retry. More retries hide flake.

## §3 - Flake quarantine integration

Failed-on-first-run-passed-on-retry tests are flake. Pattern:

1. Test fails → CI marks `@flaky` tag.
2. Continued failures over N runs → quarantine
   (move to separate suite that doesn't gate).
3. Periodic review of quarantined tests → fix or delete.

Per `flaky-test-quarantine` (in the qa-flake-triage plugin)
for the workflow.

## §4 - Artifact lifecycle

```yaml
# Recommended retention per artifact type
test-results:        14 days   # short-term debugging
coverage-reports:    30 days   # trend analysis
e2e-screenshots:     30 days   # failure debugging
performance-traces:  90 days   # historical analysis
deployment-logs:     90 days   # audit / compliance
```

Per-CI:

| CI               | Retention default                                  |
|------------------|----------------------------------------------------|
| GitHub Actions   | 90 days; configurable per artifact via `retention-days` |
| GitLab CI        | Per-job `expire_in:`; 30 days project default     |
| Jenkins          | Configured via `buildDiscarder(logRotator(...))`   |
| CircleCI         | 30 days; non-configurable on free tier             |

Don't retain forever - storage cost.

## §5 - Per-trigger filtering

```
Per-PR (push to PR branch):
  - Smoke tests.
  - Lint + unit tests.
  - Per-changed-files coverage gate.

Per-merge to main:
  - Full unit + integration suite.
  - Smoke E2E.
  - Coverage trend tracking.

Per-deploy to staging:
  - Smoke E2E against staging.
  - Synthetic monitor smoke.

Nightly scheduled:
  - Full E2E across browsers.
  - Full security scans (axe, OWASP).
  - Mutation testing (per `stryker-mutation`).

Pre-release tag:
  - Cross-platform matrix (per `mobile-device-matrix-toolkit`).
  - Cross-browser matrix (per `browser-matrix-runner`).
  - Manual UAT sign-off.

Manual / on-demand:
  - Specific debug runs.
  - Performance / load tests.
```

Tier the cadence to balance feedback latency vs cost.

## §6 - Concurrency control

When PRs receive rapid pushes:

| CI               | Pattern                                           |
|------------------|---------------------------------------------------|
| GitHub Actions   | `concurrency: group: ${{ github.workflow }}-${{ github.head_ref }}` + `cancel-in-progress: true` |
| GitLab CI        | `interruptible: true` per job                     |
| Jenkins          | `disableConcurrentBuilds()` in pipeline options   |
| CircleCI         | `auto-cancel-redundant-workflows` in project settings |

The pattern: cancel superseded runs. Saves CI cost on stale
commits.

## §7 - JUnit XML reporting (cross-CI standard)

Every modern CI accepts JUnit XML via either native plugin or
third-party action:

| CI               | JUnit XML support                                  |
|------------------|----------------------------------------------------|
| GitHub Actions   | `dorny/test-reporter` action                       |
| GitLab CI        | `artifacts.reports.junit:` (native)               |
| Jenkins          | `junit '...'` (JUnit Plugin; native)               |
| CircleCI         | `store_test_results:` (native; feeds Insights)     |

Always emit JUnit XML; downstream parser via `junit-xml-analysis` (in the qa-test-reporting plugin).

## §8 - Secret management

```
Never:
- Commit credentials to .yml / Jenkinsfile
- Use secrets in pull_request from forks
- Use `set -x` in scripts that handle secrets

Always:
- CI platform's secret store
- Mask in logs (`echo "::add-mask::$VALUE"` for GHA)
- Rotate on schedule
- Scope per-job (job-level env > workflow-level env > global)
```

## §9 - Per-language standard reporters

| Language          | Default reporter                       | JUnit XML output                          |
|-------------------|----------------------------------------|-------------------------------------------|
| JavaScript (Jest) | `default`                               | `jest-junit` (separate package)            |
| TypeScript        | (same as JS)                            | (same)                                     |
| Python (pytest)    | `pytest`                                | `pytest --junitxml=reports/junit.xml`      |
| Java (Maven)       | Surefire                                | `target/surefire-reports/*.xml` (default)  |
| Java (Gradle)      | Gradle Test                             | `build/test-results/test/*.xml` (default)  |
| .NET               | dotnet test                             | `--logger "junit;LogFilePath=..."`          |
| Go                 | `go test`                                | `gotestsum --junitfile=junit.xml`          |
| Ruby (RSpec)       | RSpec                                   | `--format RspecJunitFormatter --out junit.xml` |

The same JUnit XML feeds every CI's reporting + downstream
analysis tools.

## §10 - Per-job timeouts

| Job type           | Recommended timeout                              |
|--------------------|--------------------------------------------------|
| Lint               | 5 min                                             |
| Unit tests          | 10 min                                            |
| Integration tests   | 20 min                                            |
| E2E (per-browser)   | 30 min                                            |
| E2E (full matrix)   | 60 min                                            |
| Deploy              | 30 min                                            |
| Performance / load   | 60 min                                            |

Hard timeouts prevent runaway jobs from consuming runners.

## §11 - Cache strategies

```
Per-language cache key recommendations:
- Node: cache key on `package-lock.json` hash
- Python: cache key on `requirements.txt` / `poetry.lock` hash
- Java (Maven): cache key on `pom.xml` hash; cache `~/.m2`
- Java (Gradle): cache `~/.gradle`
- Go: cache `~/go/pkg/mod` on `go.sum` hash
- Rust: cache `~/.cargo` on `Cargo.lock` hash

Benefits: repeat installs are sub-second vs 30s-2min cold.
Trade-off: cache eviction when key changes; extra config to
manage.
```

## §12 - Cross-CI portability

If the team needs CI portability (multiple CIs in use, or anticipates
migration):

- Encapsulate logic in **shell scripts** (`scripts/test.sh`,
  `scripts/build.sh`); CI calls the script.
- Use **standard env vars** (`CI=true`, `CI_BRANCH`,
  `CI_COMMIT_SHA`); abstract per-CI vars.
- Containerize the build (Docker image with all deps); CI just
  runs the container.

The goal: `.github/workflows/test.yml`, `.gitlab-ci.yml`, and
`Jenkinsfile` are thin wrappers calling the same scripts.

## References

- [`github-actions-test-jobs`](../github-actions-test-jobs/SKILL.md),
  [`gitlab-ci-test-jobs`](../gitlab-ci-test-jobs/SKILL.md),
  [`jenkinsfile-test-stages`](../jenkinsfile-test-stages/SKILL.md),
  [`circleci-test-configs`](../circleci-test-configs/SKILL.md) - 
  per-CI implementation skills.
- `flaky-test-quarantine` - flake handling.
- `junit-xml-analysis` - JUnit XML parser.
- `e2e-suite-budget` - when to refactor instead of shard more.
