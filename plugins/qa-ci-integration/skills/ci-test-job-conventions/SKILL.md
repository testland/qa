---
name: ci-test-job-conventions
description: "Pure-reference for cross-CI test workflow conventions - when to shard (and how many shards), retry policy (which failures are safe to retry), flake-quarantine integration, artifact retention, per-trigger cadence (per-PR vs per-merge vs nightly), concurrency-cancel patterns, per-job timeouts, secret management, and cross-CI portability. Use as the team's reference for CI test-workflow design across GitHub Actions / GitLab CI / Jenkins / CircleCI; per-CI reporting and per-language reporter / cache-key lookups live in references/, as do the CircleCI test-config patterns (.circleci/config.yml workflows, test splitting, orbs, contexts - references/circleci.md)."
---

# ci-test-job-conventions

## Overview

Per-CI platform skills (GitHub Actions / GitLab CI / Jenkins /
CircleCI) cover **how to express** workflows. This skill covers
**what to express** - the cross-platform conventions that apply
regardless of CI tool.

## When to use

- Designing the CI test workflow for a new repo or service.
- Auditing an existing CI config for anti-patterns - retries that
  mask flake, no concurrency-cancel, artifacts retained forever.
- PR review of a workflow / `.gitlab-ci.yml` / `Jenkinsfile` change.
- Standardizing test-job conventions across teams on different CI tools.

## How to use this reference

1. **Size the suite, pick the shard count** from the sharding matrix
   (§1) and set the per-job timeout for each job type (§8).
2. **Set the retry policy** - which failure classes are safe to retry
   vs. quarantine as flake (§2, §3).
3. **Add concurrency-cancel** so a new push cancels the superseded run (§6).
4. **Tier the per-trigger cadence** - what runs per-PR vs per-merge vs
   nightly vs pre-release (§5).
5. **Emit JUnit XML and set artifact retention** - the reporting and
   cache lookup tables live in
   [references/junit-and-cache-lookups.md](references/junit-and-cache-lookups.md);
   retention bands in §4.
6. **Guard secrets** with the CI secret store, never in-repo (§7).

Then re-check the workflow against the conventions below.

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

## §7 - Secret management

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

## §8 - Per-job timeouts

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

## §9 - Cross-CI portability

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

## Worked example: a 25-minute Playwright E2E suite on GitHub Actions

Walk the How-to-use steps for a suite that runs 25 minutes end-to-end.

1. **Shard + timeout.** 25 min falls in the 10-30 min band (§1), so
   split into 4 shards - roughly 6-7 min wall-clock each - and set a
   30 min hard timeout per shard job (the E2E per-browser row in §8).
2. **Retry.** Allow at most 1 framework-level retry for a network
   timeout to a dependency (§2); a test that only passes on that retry
   is flake, not a pass - tag it `@flaky` and quarantine it (§3)
   rather than retrying further.
3. **Concurrency.** Set
   `concurrency: group: ${{ github.workflow }}-${{ github.head_ref }}`
   with `cancel-in-progress: true` (§6) so a fresh push to the PR
   cancels the superseded run.
4. **Cadence.** Run a smoke subset per-PR, the full 4-shard E2E
   per-merge to main, and the full cross-browser E2E nightly (§5).
5. **Reporting + artifacts.** Emit JUnit XML via `dorny/test-reporter`
   so results feed `junit-xml-analysis`
   ([references/junit-and-cache-lookups.md](references/junit-and-cache-lookups.md)),
   and upload failure screenshots with `retention-days: 30` - the
   `e2e-screenshots` band in §4.

## Deep references

The per-CI reporting mechanism and the per-language reporter and
dependency-cache lookups live in one companion reference so this file
stays a decision surface:

- **Reporting + cache lookups** - JUnit XML support per CI, default
  reporters per language, and per-language cache-key recommendations:
  [references/junit-and-cache-lookups.md](references/junit-and-cache-lookups.md).
- **CircleCI test configs** - `.circleci/config.yml` workflows, executors,
  timing-based test splitting, orbs, insights, contexts:
  [references/circleci.md](references/circleci.md).

## References

- `github-actions-test-jobs`,
  `gitlab-ci-test-jobs`,
  `jenkinsfile-test-stages` - 
  per-CI implementation skills.
- CircleCI patterns: [references/circleci.md](references/circleci.md).
- `flaky-test-quarantine` - flake handling.
- `junit-xml-analysis` - JUnit XML parser.
- `e2e-suite-budget` - when to refactor instead of shard more.
- Reporting + cache lookups (per-CI JUnit, per-language reporters +
  cache keys):
  [references/junit-and-cache-lookups.md](references/junit-and-cache-lookups.md).
