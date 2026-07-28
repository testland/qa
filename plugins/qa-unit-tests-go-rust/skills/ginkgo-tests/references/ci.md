# Ginkgo CI integration

Per [Ginkgo documentation](https://onsi.github.io/ginkgo/).

## GitHub Actions with coverage

```yaml
- run: go install github.com/onsi/ginkgo/v2/ginkgo@latest
- run: ginkgo -p --cover --coverprofile=coverage.out --no-focus -r
- uses: codecov/codecov-action@v4
  with: { files: coverage.out }
```

- `-p` runs specs in parallel across the CPU count.
- `--cover --coverprofile=coverage.out` emits a Go coverage profile.
- `--no-focus` fails the build if any `F`-prefix specs exist (catches
  debug-leftover focus).
- `-r` recurses into all packages.

## JUnit XML output

For CI systems that ingest JUnit test reports:

```bash
ginkgo --junit-report=junit.xml -r
```

This writes a JUnit-format report that most CI dashboards render as a
per-spec pass/fail table.

## Gating on focused specs

`ginkgo --no-focus` errors if the suite contains any focused (`F`-prefix)
specs. Wire it into the CI run so an accidentally committed `FDescribe` or
`FIt` fails the pipeline instead of silently skipping the rest of the suite.
