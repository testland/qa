# GitHub Actions - service containers and reporting

Deeper recipes split out of `github-actions-test-jobs` SKILL.md:
wiring the service containers the tests depend on, and publishing
JUnit results as artifacts plus PR-check summaries.

## Service containers (PostgreSQL, Redis, etc.)

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

## JUnit reporting + artifacts

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
