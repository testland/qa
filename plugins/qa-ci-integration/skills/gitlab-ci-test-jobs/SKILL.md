---
name: gitlab-ci-test-jobs
description: "Configures GitLab CI/CD test stages - `.gitlab-ci.yml` with parallel matrix, artifact reports (junit, coverage), services (postgres, redis), needs / dependencies between jobs, only/except + rules for trigger filtering, retry policy. Use when the project hosts on GitLab and the team wants idiomatic GitLab CI patterns."
---

# gitlab-ci-test-jobs

## Overview

Configured via `.gitlab-ci.yml` at the repo root. Structure:
**stages** (sequential phases) → **jobs** (parallel within a
stage) → **steps** (a job's `script:` array).

## When to use

- Project hosts on GitLab (self-hosted or .com).
- Existing `.gitlab-ci.yml` needs standardization.
- The team values GitLab's tight VCS / CI / registry / artifacts
  integration.

## Step 1 - Basic test job

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm test
```

Default: runs on every push to any branch. Per-branch / per-MR
filtering via `rules:` (Step 7).

## Step 2 - Parallel matrix

```yaml
test:
  stage: test
  image: node:22
  parallel:
    matrix:
      - NODE_VERSION: ['20', '22']
        OS_IMAGE: ['node:20', 'node:22']
  script:
    - npm ci
    - npm test
```

`parallel: matrix:` runs the job once per matrix entry. Use
GitLab's matrix syntax for cross-product / explicit `include` for
specific combinations.

## Step 3 - Services (PostgreSQL, Redis)

```yaml
test:
  stage: test
  image: node:22
  services:
    - name: postgres:15
      alias: postgres
      variables:
        POSTGRES_PASSWORD: test
    - name: redis:7
      alias: redis
  variables:
    DATABASE_URL: 'postgres://postgres:test@postgres:5432/postgres'
    REDIS_URL: 'redis://redis:6379'
  script:
    - npm ci
    - npm test
```

The service hostname is the `alias` field; reachable from the job
container.

## Step 4 - JUnit + coverage reports

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm test -- --reporters=default --reporters=jest-junit
  artifacts:
    when: always
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - junit.xml
      - coverage/
    expire_in: 30 days
  coverage: '/Lines\s*:\s*([0-9.]+)%/'
```

GitLab natively renders:
- JUnit XML in the MR's "Test summary."
- Coverage in the MR widget (the `coverage:` regex parses %).
- Cobertura coverage as inline annotations on diff lines.

## Step 5 - Stages + needs

```yaml
stages:
  - lint
  - test
  - integration
  - e2e

lint:
  stage: lint
  script: npm run lint

unit:
  stage: test
  script: npm test
  needs: [lint]   # don't wait for stage; run as soon as lint passes

integration:
  stage: integration
  script: npm run test:integration
  needs: [unit]

e2e:
  stage: e2e
  script: npm run test:e2e
  needs: [integration]
```

`needs:` enables DAG-style pipelines (newer GitLab feature) - jobs
run as soon as their dependencies finish, not waiting for the
full stage.

## Step 6 - Retry policy

```yaml
test:
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
      - api_failure
```

Distinguish retry classes:
- `runner_system_failure` - runner died; safe to retry.
- `script_failure` - test failed; **don't retry** (masks bugs).
- `unknown_failure` - case by case.

## Step 7 - Trigger filtering via `rules:`

```yaml
test:
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
      changes:
        - 'src/**/*'
        - 'tests/**/*'
        - 'package.json'
    - if: $CI_COMMIT_BRANCH == 'main'
    - if: $CI_PIPELINE_SOURCE == 'schedule'
  script:
    - npm test
```

Modern `rules:` replaces older `only:` / `except:` (still work but
deprecated for new config).

## Step 8 - Caching

```yaml
test:
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
      - node_modules/
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
```

`cache:` per-job; speeds repeat installs. Pin the key to
`package-lock.json` so cache invalidates on dep changes.

## Step 9 - Variables + secrets

```yaml
variables:
  CI: 'true'
  NODE_ENV: 'test'

test:
  script:
    - npm test
  variables:
    # Job-level overrides
    NODE_AUTH_TOKEN: $CI_NPM_TOKEN
```

Secrets configured in **Project Settings → CI/CD → Variables**
(masked + protected for sensitive values).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `retry: 5` on test failures                                            | Hides flake; never resolved.                                              | `retry: when:` only for runner / API failures (Step 6). |
| Hardcoded credentials in `.gitlab-ci.yml`                              | Secrets in repo.                                                          | CI/CD Variables (Step 9). |
| One mega-stage with all jobs                                            | No parallelism; slow pipeline.                                            | Stages + needs (Step 5). |
| Missing artifact upload on failure                                      | Failure debugging needs results.                                          | `when: always` (Step 4). |
| Default `image:` for everything                                         | Pulls Docker image per job; slow.                                         | Pin lightweight default (e.g., `alpine:latest` for non-build jobs). |

## Limitations

- **GitLab Runner setup for self-hosted.** Initial setup adds
  ops cost.
- **SaaS quota.** GitLab.com free tier has minute caps; private
  projects have stricter limits.
- **Per-job overhead.** Each job pulls images + clones repo;
  short-lived jobs are inefficient.
- **YAML complexity grows.** Large pipelines benefit from
  `include:` to split across files.

## References

- GitLab CI/CD docs at `docs.gitlab.com/ee/ci/`.
- `github-actions-test-jobs`,
  `jenkinsfile-test-stages` - 
  alternatives.
- `ci-test-job-conventions` - cross-CI conventions; CircleCI patterns
  live in its references/circleci.md.
- `junit-xml-analysis` - JUnit XML parser.
- `cobertura-analysis` - Cobertura parser (GitLab's native coverage format).
