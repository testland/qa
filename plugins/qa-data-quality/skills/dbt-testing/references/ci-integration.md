# dbt CI integration

Patterns for running `dbt build` (preferred over standalone `dbt test`) in
CI, with artifact upload and slim-CI scoping. All snippets use `dbt build`
because of its DAG-aware skip-on-failure behavior — a failing upstream
test causes downstream resources to skip, which is what you want in a
quality gate ([dbt-build][1]).

[1]: https://docs.getdbt.com/reference/commands/build

## GitHub Actions

```yaml
name: dbt build

on:
  pull_request:
  push:
    branches: [main]

jobs:
  dbt-build:
    runs-on: ubuntu-latest
    env:
      DBT_PROFILES_DIR: .ci/dbt
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0          # needed for state:modified+ slim CI

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dbt + adapter
        run: pip install 'dbt-core>=1.8' 'dbt-postgres'

      - name: dbt deps
        run: dbt deps

      # Slim CI: only build/test changed nodes + their descendants.
      # Requires manifest.json from a previous run (e.g. main) at .dbt-state/.
      - name: dbt build (slim)
        run: |
          if [ -f .dbt-state/manifest.json ]; then
            dbt build --select state:modified+ --state .dbt-state/
          else
            dbt build
          fi

      - name: Upload run_results.json
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dbt-run-results
          path: |
            target/run_results.json
            target/manifest.json
          retention-days: 14
```

The `if: always()` on the artifact upload is important — without it,
`run_results.json` is lost on failure, which is exactly when you need it
for triage.

## GitLab CI

```yaml
dbt-build:
  image: python:3.12
  variables:
    DBT_PROFILES_DIR: $CI_PROJECT_DIR/.ci/dbt
  before_script:
    - pip install 'dbt-core>=1.8' 'dbt-postgres'
    - dbt deps
  script:
    - dbt build
  artifacts:
    when: always
    paths:
      - target/run_results.json
      - target/manifest.json
    expire_in: 14 days
```

## Jenkins (declarative)

```groovy
pipeline {
  agent any
  environment {
    DBT_PROFILES_DIR = "${WORKSPACE}/.ci/dbt"
  }
  stages {
    stage('Install') {
      steps {
        sh 'pip install --user "dbt-core>=1.8" "dbt-postgres"'
        sh 'dbt deps'
      }
    }
    stage('Build') {
      steps {
        sh 'dbt build'
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'target/run_results.json,target/manifest.json',
                       allowEmptyArchive: true
    }
  }
}
```

## Slim CI: scoping to changed nodes

The `state:modified+` selector restricts a build to nodes that changed
relative to a baseline `manifest.json` (downloaded from a previous main
run) plus their descendants ([dbt-build][1]):

```bash
# 1. On main: produce the baseline manifest and store it (e.g. S3, artifact)
dbt build
mkdir -p .dbt-state
cp target/manifest.json .dbt-state/

# 2. On PR: download .dbt-state/manifest.json, then:
dbt build --select state:modified+ --state .dbt-state/
```

This is the canonical pattern for a fast PR check that doesn't rebuild
the entire warehouse.

## Empty / dry-run validation

Use `--empty` (dbt 1.8+) for a zero-row build that compiles every node
and checks DAG integrity without expensive data reads ([dbt-build][1]):

```bash
dbt build --empty
```

Pair this with the slim-CI pattern when you want a fast dependency-graph
check before kicking off the data build.

## Storing failures for triage

Add `--store-failures` to materialize the failing rows of each test into
a warehouse audit table:

```bash
dbt build --store-failures
```

The audit tables let you triage failures with the actual offending rows
in hand, instead of only the count from `run_results.json`.

## Parsing run_results.json in CI

A small post-build step that surfaces failing tests in the run summary:

```bash
jq -r '
  .results[]
  | select(.status == "fail")
  | "FAIL: \(.unique_id) — \(.failures) failing rows — \(.message)"
' target/run_results.json
```

Pipe this to `tee` and to a job summary file (`$GITHUB_STEP_SUMMARY` on
GitHub Actions) for a clickable failure report on the run page.
