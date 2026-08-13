# CircleCI test configs

Deep reference for `ci-test-job-conventions` SKILL.md. Configures CircleCI
test workflows - `.circleci/config.yml` with workflows, jobs, executors,
parallelism (test splitting), orbs (reusable shared config), insights for
analytics, contexts for per-team secrets. Consult for CircleCI-hosted CI when
the team values its parallelism + insights features.

## Overview

Configuration lives at `.circleci/config.yml`:

- **Executors** - where jobs run (Docker, machine, macOS).
- **Jobs** - individual units of work.
- **Workflows** - orchestrate jobs (sequential / parallel).
- **Orbs** - reusable, shareable config packages.

CircleCI's differentiator is **test splitting** - automatic
parallelization based on per-test timing.

## When to use

- Project is on CircleCI.
- Test suite is large enough for parallel splitting to matter
  (>5 min single-instance runtime).
- The team values orbs (per-tool reusable config).

## Step 1 - Basic test config

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run: npm ci
      - run: npm test

workflows:
  test:
    jobs:
      - test
```

`cimg/node:22.0` is CircleCI's pre-warmed Node image (faster
startup than `node:22`).

## Step 2 - Parallelism + test splitting

```yaml
jobs:
  test:
    docker:
      - image: cimg/node:22.0
    parallelism: 4
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Test (split by timing)
          command: |
            TESTS=$(circleci tests glob "tests/**/*.spec.ts")
            echo "$TESTS" | circleci tests split --split-by=timings | xargs npx jest
      - store_test_results:
          path: reports/junit
```

`circleci tests split --split-by=timings` reads prior run timings
and distributes tests evenly across 4 parallel containers.

## Step 3 - Multiple executors

```yaml
executors:
  node-22:
    docker:
      - image: cimg/node:22.0
  node-20:
    docker:
      - image: cimg/node:20.0
  with-postgres:
    docker:
      - image: cimg/node:22.0
      - image: cimg/postgres:15.0
        environment:
          POSTGRES_PASSWORD: test

jobs:
  unit:
    executor: node-22
    steps:
      - checkout
      - run: npm test

  integration:
    executor: with-postgres
    environment:
      DATABASE_URL: postgres://postgres:test@localhost:5432/postgres
    steps:
      - checkout
      - run: npm run test:integration

  unit-on-node-20:
    executor: node-20
    steps:
      - checkout
      - run: npm test
```

The second container in the executor (postgres) is reachable as
`localhost` from the primary container.

## Step 4 - Workflow orchestration

```yaml
workflows:
  test-and-deploy:
    jobs:
      - lint
      - unit:
          requires: [lint]
      - integration:
          requires: [unit]
      - e2e:
          requires: [integration]
      - deploy:
          requires: [e2e]
          filters:
            branches:
              only: main
```

`requires:` builds the DAG; `filters:` restricts when jobs run.

## Step 5 - Orbs (reusable config)

```yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0
  codecov: codecov/codecov@4.2.0

jobs:
  test:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - node/install-packages
      - run: npm test -- --coverage
      - codecov/upload:
          file: coverage/lcov.info

workflows:
  test:
    jobs: [test]
```

Orbs encapsulate common patterns (npm install, codecov upload,
slack notify, etc.). Browse at `circleci.com/developer/orbs`.

## Step 6 - Test results + artifacts

```yaml
- run:
    name: Test
    command: npm test -- --reporters=default --reporters=jest-junit
    environment:
      JEST_JUNIT_OUTPUT_FILE: reports/junit/junit.xml

- store_test_results:
    path: reports/junit/

- store_artifacts:
    path: coverage/
    destination: coverage
```

`store_test_results:` parses JUnit XML and renders results in the
CircleCI UI (Insights tab tracks flakes / slow tests over time).

`store_artifacts:` uploads files; viewable via the build's
Artifacts tab.

## Step 7 - Insights (CircleCI's analytics)

CircleCI Insights tracks per-test metrics:
- Flaky tests (passing then failing on retry).
- Slowest tests.
- Per-job duration trends.
- Pipeline duration.

Available via the project's Insights tab; no extra config needed
(uses the data from `store_test_results`).

## Step 8 - Contexts (shared secrets)

```yaml
workflows:
  test:
    jobs:
      - integration:
          context: test-database-credentials
```

Contexts are project-organization-level credential stores - 
secrets shared across multiple projects without re-entering.
Configured in Org Settings.

## Step 9 - Conditional / parameterized

```yaml
parameters:
  run-e2e:
    type: boolean
    default: false

jobs:
  e2e:
    when: << pipeline.parameters.run-e2e >>
    steps:
      - run: npx playwright test

# Trigger from API with:
# {"parameters": {"run-e2e": true}}
```

Useful for opt-in expensive tests (cross-browser, full regression).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `parallelism: N` without test splitting                               | All N containers run all tests; wasted parallelism.                      | `circleci tests split` (Step 2). |
| Hardcoded credentials in config.yml                                    | Secret leak.                                                              | Contexts or env vars (Step 8). |
| `version: 2` (deprecated)                                              | Lacks features; orbs / parameters not available.                          | Always `version: 2.1` (Step 1). |
| Not using orbs for common patterns                                    | Boilerplate per project.                                                  | Orbs (Step 5). |
| Missing `store_test_results`                                           | Insights doesn't populate; flake tracking missing.                       | Always store results (Step 6). |
| One mega-job for unit + integration + E2E                              | No parallelism; slow.                                                     | Workflow with parallel jobs (Step 4). |

## Limitations

- **CircleCI-specific.** Migration to other CI requires rewrite.
- **Test splitting needs prior run data.** First run doesn't
  benefit; subsequent runs do.
- **Cost model.** Free tier limited; paid plans charge per minute /
  per resource class.
- **Per-orb update cadence varies.** Some orbs are stale.

## References

- CircleCI docs at `circleci.com/docs/`.
- `github-actions-test-jobs`,
  `gitlab-ci-test-jobs`,
  `jenkinsfile-test-stages` - 
  alternatives.
- `ci-test-job-conventions` SKILL.md - the cross-CI conventions this
  reference belongs to.
