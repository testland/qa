---
name: github-actions-test-jobs
description: "Use whenever the task is to run tests in GitHub Actions: a test workflow on pull requests, matrix builds across OS and runtime versions, splitting a suite across parallel runners, service containers such as Postgres or Redis, uploading JUnit reports, and trigger filters."
---

# github-actions-test-jobs

## Overview

Test workflows are YAML files in `.github/workflows/` that run jobs on
trigger events ([gha][gha]). This skill sets up the idiomatic patterns -
matrix builds, sharding, service containers, JUnit reporting, trigger
filtering, concurrency, and secrets. Start with the minimal pattern in
Step 1.

[gha]: https://docs.github.com/en/actions/using-workflows/about-workflows
[syntax]: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
[events]: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
[limits]: https://docs.github.com/en/actions/reference/limits
[billing]: https://docs.github.com/en/billing/concepts/product-billing/github-actions
[jest-shard]: https://jestjs.io/docs/cli#--shard
[retry]: https://github.com/nick-fields/retry

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
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: '24' }
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
        node: [22, 24]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci
      - run: npm test
```

Per [workflow syntax][syntax], when `fail-fast` is true GitHub "will
cancel all in-progress and queued jobs in the matrix if any job in the
matrix fails", and "This property defaults to `true`". Set it to `false`
explicitly so every OS and runtime reports. Matrix size is OS × Node =
3 × 2 = 6 jobs; per [limits][limits], "A job matrix can generate a
maximum of 256 jobs per workflow run."

To let one experimental target fail without cancelling the rest, mark
it with `continue-on-error: ${{ matrix.experimental }}`, which per
[workflow syntax][syntax] "applies to a single job".

Runner pinning, per-language runtime matrices (Node / Python / Java /
.NET), OS-specific quirks (path separators, line endings, case
sensitivity, shells), per-OS conditional steps and tests, and the
tiered cost-management cadence are in
[references/os-matrix.md](references/os-matrix.md).

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
      - uses: actions/checkout@v7
      - run: npx jest --shard=${{ matrix.shard }}/4
```

4 parallel jobs, each running 1/4 of the test suite. Per
[jest-cli][jest-shard], `--shard` takes `shardIndex/shardCount`, both
"1-based, positive numbers". Wall-clock time drops; billed minutes stay
about the same plus each job's setup time. Playwright (`--shard=1/4`)
and pytest-xdist splitting follow the same matrix shape.

## Service containers and reporting

Wiring the service containers the tests depend on (PostgreSQL,
Redis) and publishing JUnit XML as artifacts plus PR-check
summaries are in
[references/services-and-reporting.md](references/services-and-reporting.md).

## Step 6 - Retry policy

GitHub Actions doesn't ship native test-retry; use the framework's
retry mechanism (e.g., Playwright's `retries` config) or a wrapper
action such as [nick-fields/retry][retry], which takes
`timeout_minutes` (or `timeout_seconds`), `max_attempts` and `command`:

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
budget. Per [workflow syntax][syntax], "Use the paths-ignore filter when
you only want to exclude file path patterns"; to include and exclude in
one list, use `paths` with `!` prefixes.

Per [events][events], "By default, scheduled workflows run in UTC", "The
shortest interval you can run scheduled workflows is once every 5
minutes", "Scheduled workflows run on the latest commit on the default
branch", and the event "can be delayed during periods of high loads".
Don't schedule a nightly run at minute 0 if timing matters; pick an odd
minute.

Per [workflow syntax][syntax], the filter decides "if a workflow should
run" from the changed files. A workflow that doesn't run posts no status
for its jobs, so if a branch rule requires one of those jobs, a PR that
only touches docs waits for a check that never arrives. Keep path filters off
workflows whose jobs are required checks, or filter inside the job
instead.

## Step 8 - Concurrency control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
```

When a PR receives multiple pushes, the older runs cancel -
saves CI cost on superseded commits. Per [workflow syntax][syntax], a
new run only replaces a pending one by default; "To also cancel any
currently running job or workflow in the same concurrency group,
specify cancel-in-progress: true". Don't use this group on `main`
pushes that deploy: a cancelled deploy can leave an environment half
updated.

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
4. Tests emit `test-results/junit.xml`; `actions/upload-artifact@v7`
   with `if: always()` keeps the report even when tests fail, and
   `dorny/test-reporter@v3` renders it in the PR check summary.
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
| No `timeout-minutes` on the test job                                   | A hung test burns up to the 360-minute default.                           | `timeout-minutes: 20` (or the suite's p99 plus margin). |
| Path filter on a workflow that runs a required check                   | The check never reports; docs-only PRs stay blocked.                       | Filter inside the job, or keep the workflow unfiltered (Step 7). |

## Limitations

- **Runner cost.** Per [billing][billing], "jobs that run on Windows and
  macOS runners hosted by GitHub cost more to run than jobs on Linux
  runners"; its example prices Linux at $0.006 per minute and Windows at
  $0.010. Run the full OS matrix on `main` or nightly, Linux on PRs.
- **Per-job 6h timeout.** Per [limits][limits], "Each job in a workflow
  can run for up to 6 hours of execution time", and per [workflow
  syntax][syntax] `timeout-minutes` defaults to 360. Set a much lower
  `timeout-minutes` on test jobs so a hung test fails in minutes, not
  hours.
- **Service containers Linux-only.** Per [workflow syntax][syntax],
  service containers need a Linux runner ("If you are using GitHub-hosted
  runners, you must use an Ubuntu runner").
- **No built-in JUnit XML viewer.** Upload the XML as an artifact and
  render it with a reporter action such as `dorny/test-reporter`.

## References

- [gha][gha] - GitHub Actions workflow basics: events + jobs +
  steps; YAML in `.github/workflows/`.
- [syntax][syntax] - workflow syntax: `fail-fast` default, `continue-on-error`,
  `paths-ignore`, `concurrency` and `cancel-in-progress`,
  `timeout-minutes` default, Linux-only service containers.
- [events][events] - `schedule` (UTC, 5-minute minimum, default branch,
  delays) and `workflow_dispatch`.
- [limits][limits] - 6-hour job limit, 256-job matrix limit.
- [billing][billing] - per-minute runner rates by OS.
- [jest-shard][jest-shard] - Jest `--shard` format.
- [retry][retry] - `nick-fields/retry` inputs.
- [references/os-matrix.md](references/os-matrix.md) - OS / runtime matrix depth + per-OS quirks.
- [references/services-and-reporting.md](references/services-and-reporting.md) - service container + JUnit reporting recipes.
- `gitlab-ci-test-jobs`,
  `jenkinsfile-test-stages` -
  per-platform alternatives.
- `ci-test-job-conventions` - cross-CI conventions; CircleCI patterns
  live in its references/circleci.md.
- `junit-xml-analysis` - downstream JUnit XML parser.
- `flaky-test-quarantine` - preferred over retries.
