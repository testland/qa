---
name: github-actions-test-jobs
description: "Configures GitHub Actions test workflows - `.github/workflows/test.yml` with matrix builds (OS × runtime), JUnit XML artifact upload, retry/sharding, services (PostgreSQL, Redis), per-trigger filtering (pull_request, push, schedule, workflow_dispatch). Use when the project hosts on GitHub and the team wants idiomatic GitHub Actions patterns for test workflows."
---

# github-actions-test-jobs

## Overview

Test workflows are YAML files in `.github/workflows/` that run jobs on
trigger events ([gha][gha]). This skill sets up the idiomatic patterns -
matrix builds, sharding, service containers, JUnit reporting, trigger
filtering, concurrency, and secrets. Start with the minimal pattern in
Step 1.

[gha]: https://docs.github.com/en/actions/using-workflows/about-workflows

## When to use

- Project on GitHub.
- Need to set up test CI for a new repo.
- Existing GitHub Actions workflows need standardization.

## How to use

1. Add `.github/workflows/test.yml` triggered on `pull_request`
   and push to `main`; check out the repo and set up the runtime
   (Step 1).
2. Install dependencies and run the suite (`npm ci` then
   `npm test`).
3. Add a build matrix over OS and runtime versions with
   `fail-fast: false` for multi-target signal (Step 2), and shard
   large suites across parallel jobs (Step 3).
4. Wire any service containers the tests need and emit JUnit XML,
   uploading it with `if: always()` -
   [references/services-and-reporting.md](references/services-and-reporting.md).
5. Filter triggers by path and add `schedule` / `workflow_dispatch`
   (Step 7); add a `concurrency` group so superseded pushes cancel
   (Step 8).
6. Move tokens into `secrets.*` and reference them from step `env`
   (Step 9).
7. Verify the workflow runs (see Verify below), then review the
   anti-patterns table before merging.

## Step 1 - Basic test workflow

```yaml
# .github/workflows/test.yml
name: test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test
```

The minimal pattern: trigger on PR + push-to-main, install deps,
run tests.

## Step 2 - Matrix builds

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci
      - run: npm test
```

`fail-fast: false` ensures one matrix failure doesn't cancel
others. Matrix size is OS × Node = 3 × 2 = 6 jobs.

## Step 3 - Sharding for parallel execution

For large suites:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx jest --shard=${{ matrix.shard }}/4
```

4 parallel jobs, each running 1/4 of the test suite. Faster than
serial execution; cost-equivalent (same total CPU-time).

## Service containers and reporting

Wiring the service containers the tests depend on (PostgreSQL,
Redis) and publishing JUnit XML as artifacts plus PR-check
summaries are in
[references/services-and-reporting.md](references/services-and-reporting.md).

## Step 6 - Retry policy

GitHub Actions doesn't ship native test-retry; use the framework's
retry mechanism (e.g., Playwright's `retries` config) or a wrapper
action:

```yaml
- uses: nick-fields/retry@v3
  with:
    timeout_minutes: 10
    max_attempts: 2
    command: npm test
```

Use sparingly - retries hide flake. Prefer
`flaky-test-quarantine` (in the qa-flake-triage plugin).

## Step 7 - Per-trigger filtering

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'

  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '*.md'

  schedule:
    - cron: '0 4 * * *'   # daily 4am UTC

  workflow_dispatch:        # manual trigger
    inputs:
      target_browser:
        description: 'Browser to test'
        type: choice
        options: [chrome, firefox, safari]
        default: chrome
```

Path filters skip workflows when only docs change - saves CI
budget.

## Step 8 - Concurrency control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
```

When a PR receives multiple pushes, the older runs cancel -
saves CI cost on superseded commits.

## Step 9 - Secrets + env

```yaml
env:
  CI: true

steps:
  - run: npm test
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

Secrets configured in repo settings; never committed.

## Verify before merge

Run the workflow once before merging - push the branch or trigger it
manually via `workflow_dispatch` (or dry-run locally with `act`).

Verify: the matrix expands into the expected job count (e.g. OS × Node =
3 × 2 = 6 jobs) and each job uploads its JUnit artifact. If a job fails on
a missing secret, confirm `NPM_TOKEN` / `TEST_DATABASE_URL` exist under
repo **Settings -> Secrets and variables -> Actions**, add any that are
missing, and re-run the job.

## Worked example

A Node service needs PR tests on Linux + macOS, plus a nightly
full run against PostgreSQL.

1. `test.yml` triggers on `pull_request` and `push` to `main`,
   with `schedule: cron '0 4 * * *'` for the nightly run.
2. The `test` job runs a matrix of `os: [ubuntu-latest,
   macos-latest]` × `node: [20, 22]` with `fail-fast: false` - 4
   jobs, and no target cancels another.
3. A separate `integration` job (Linux only) declares a
   `postgres:15` service with a `pg_isready` healthcheck and
   passes `DATABASE_URL` into `npm test`.
4. Tests emit `test-results/junit.xml`; `actions/upload-artifact@v4`
   with `if: always()` keeps the report even when tests fail, and
   `dorny/test-reporter@v1` renders it in the PR check summary.
5. A `concurrency` group keyed on the ref cancels superseded runs,
   so rapid pushes don't pile up billable minutes.

Result: PR authors get fast cross-platform signal, the nightly
catches DB-integration regressions, and failed runs still surface
their JUnit report.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `fail-fast: true` on matrix                                            | First failure cancels all; lose multi-target signal.                    | `fail-fast: false` (Step 2). |
| No `concurrency` group                                                 | PRs with rapid pushes pile CI runs.                                       | Add concurrency cancel (Step 8). |
| `if: always()` everywhere                                              | Some steps shouldn't run on failure (deploy).                            | Selective `if: always()` for upload steps only ([services-and-reporting](references/services-and-reporting.md)). |
| Hardcoded secrets in YAML                                              | Secret leak; revocation needed.                                           | `secrets.X` references (Step 9). |
| Massive single workflow file                                            | Hard to navigate; merge conflicts.                                        | Split per concern (test.yml, deploy.yml, lint.yml). |
| Missing `actions/checkout` step                                         | Job can't access repo files.                                              | First step always (Step 1). |

## Limitations

- **Runner cost.** macOS / Windows runners 5x-10x more expensive
  than Linux (after free quota). Budget accordingly.
- **Per-job 6h timeout.** Long jobs need splitting.
- **Service containers Linux-only.** macOS / Windows runners don't
  support `services:` block.
- **JUnit reporting requires a third-party action.** No native.

## References

- [gha][gha] - GitHub Actions workflow basics: events + jobs +
  steps; YAML in `.github/workflows/`.
- [references/services-and-reporting.md](references/services-and-reporting.md) - service container + JUnit reporting recipes.
- `gitlab-ci-test-jobs`,
  `jenkinsfile-test-stages`,
  `circleci-test-configs` -
  per-platform alternatives.
- `ci-test-job-conventions` - cross-CI conventions.
- `junit-xml-analysis` - downstream JUnit XML parser.
- `flaky-test-quarantine` - preferred over retries.
