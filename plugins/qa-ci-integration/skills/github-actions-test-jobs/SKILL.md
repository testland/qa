---
name: github-actions-test-jobs
description: "Configures GitHub Actions test workflows - `.github/workflows/test.yml` with matrix builds (OS × runtime), JUnit XML artifact upload, retry/sharding, services (PostgreSQL, Redis), per-trigger filtering (pull_request, push, schedule, workflow_dispatch). Use when the project hosts on GitHub and the team wants idiomatic GitHub Actions patterns for test workflows."
rating: 23
d6: 4
archetype: S1
---

# github-actions-test-jobs

## Overview

Per [gha-workflows][gha]:

[gha]: https://docs.github.com/en/actions/using-workflows/about-workflows

> "A workflow is a configurable automated process that will run
> one or more jobs."

> "[Workflows] are stored as YAML files in the `.github/workflows`
> directory and execute tasks like building pull requests,
> deploying applications, or managing issues."

A workflow has three essential elements ([gha-workflows][gha]):

> 1. **Events** - "One or more events that will trigger the
>    workflow"
> 2. **Jobs** - "One or more jobs, each of which will execute on
>    a runner machine"
> 3. **Steps** - Each job contains "a series of one or more steps"

## When to use

- Project on GitHub.
- Need to set up test CI for a new repo.
- Existing GitHub Actions workflows need standardization.

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

## Step 4 - Services (PostgreSQL, Redis, etc.)

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: [5432:5432]
      redis:
        image: redis:7
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
```

GitHub Actions provides container-based services on Linux
runners. Healthcheck options ensure tests don't start before the
DB is ready.

## Step 5 - JUnit reporting + artifacts

```yaml
- run: npm test -- --reporters=default --reporters=jest-junit

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: test-results
    path: test-results/

- uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Test results
    path: test-results/junit.xml
    reporter: java-junit
```

`if: always()` ensures artifacts upload even on test failure.
The `dorny/test-reporter` action surfaces results in the
PR check summary.

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
[`flaky-test-quarantine`](../../qa-flake-triage/skills/flaky-test-quarantine/SKILL.md).

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

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `fail-fast: true` on matrix                                            | First failure cancels all; lose multi-target signal.                    | `fail-fast: false` (Step 2). |
| No `concurrency` group                                                 | PRs with rapid pushes pile CI runs.                                       | Add concurrency cancel (Step 8). |
| `if: always()` everywhere                                              | Some steps shouldn't run on failure (deploy).                            | Selective `if: always()` for upload steps only (Step 5). |
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
- [`gitlab-ci-test-jobs`](../gitlab-ci-test-jobs/SKILL.md),
  [`jenkinsfile-test-stages`](../jenkinsfile-test-stages/SKILL.md),
  [`circleci-test-configs`](../circleci-test-configs/SKILL.md) - 
  per-platform alternatives.
- [`ci-test-job-conventions`](../ci-test-job-conventions/SKILL.md) - cross-CI conventions.
- [`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md) - downstream JUnit XML parser.
- [`flaky-test-quarantine`](../../qa-flake-triage/skills/flaky-test-quarantine/SKILL.md) - preferred over retries.
