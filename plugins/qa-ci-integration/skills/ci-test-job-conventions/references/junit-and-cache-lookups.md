# CI JUnit and cache-key lookup tables

Deep reference for `ci-test-job-conventions` SKILL.md. Consult by CI
platform and language once the workflow's shard / retry / cadence
decisions are made - these tables carry no design decisions, only the
concrete mechanism per platform and per language.

## JUnit XML reporting (cross-CI standard)

Every modern CI accepts JUnit XML via either a native plugin or a
third-party action:

| CI               | JUnit XML support                                  |
|------------------|----------------------------------------------------|
| GitHub Actions   | `dorny/test-reporter` action                       |
| GitLab CI        | `artifacts.reports.junit:` (native)               |
| Jenkins          | `junit '...'` (JUnit Plugin; native)               |
| CircleCI         | `store_test_results:` (native; feeds Insights)     |

Always emit JUnit XML; the same output feeds every CI's reporting and
the downstream `junit-xml-analysis` parser (in the qa-test-reporting
plugin).

## Per-language standard reporters

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

The same JUnit XML feeds every CI's reporting + downstream analysis
tools.

## Per-language cache strategies

Per-language cache key recommendations:

- Node: cache key on `package-lock.json` hash
- Python: cache key on `requirements.txt` / `poetry.lock` hash
- Java (Maven): cache key on `pom.xml` hash; cache `~/.m2`
- Java (Gradle): cache `~/.gradle`
- Go: cache `~/go/pkg/mod` on `go.sum` hash
- Rust: cache `~/.cargo` on `Cargo.lock` hash

Benefits: repeat installs are sub-second vs 30s-2min cold. Trade-off:
cache eviction when key changes; extra config to manage.
