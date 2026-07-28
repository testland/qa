# Per-test instrumentation and CI

Supporting detail for `regression-suite-selector`: per-framework recipes for
emitting per-test coverage, the Bazel build-graph selection path, and the CI
workflow. The core selector (`build_map`, `git diff`, `select_tests`) stays
inline in SKILL.md.

## Per-test coverage instrumentation (Path A)

Modify the test runner to emit per-test coverage instead of merged coverage,
then feed it to `build_map` (SKILL.md Step 2):

- Jest: `--coverage` writes `coverage/coverage-final.json` with per-test `f`
  (function-hit) maps when the runner is configured for it; or use
  `jest-coverage-tracking` for per-test data.
- pytest + coverage.py: `coverage run --concurrency=multiprocessing -m pytest --cov-context=test`
  emits per-test contexts.
- Java + JaCoCo: per-test "session" mode (`destfile=...sessionId=<test>.exec`).

Persist the built map as `test-map.json`, checked into the repo or stored as a
CI artifact updated on every main run.

## Path B - From the build graph (Bazel / Pants / Buck)

In Bazel projects, the dependency graph IS the test-source map:

```bash
# What tests depend on changed files?
bazel query 'kind("_test", rdeps(//..., set(<changed-files>)))'
```

A Bazel target is actually dependent on target Y if Y must be present, built,
and up-to-date for X to build correctly; `rdeps(<scope>, <target>)` reverses
the edge and finds targets that depend on `<target>`
(https://bazel.build/concepts/dependencies).

```bash
CHANGED=$(git diff --name-only origin/main...HEAD | sed 's|^|//|')
bazel query "kind('_test', rdeps(//..., set(${CHANGED})))" \
  | xargs bazel test
```

Declared dependencies must comprehensively cover actual dependencies for
correct incremental rebuilds, so the build-graph approach is only as good as
BUILD-file discipline. Lint via `buildozer` / `gazelle` to catch missing
declarations.

## CI workflow (selected run + shadow full run)

```yaml
# .github/workflows/regression.yml
jobs:
  selected:
    runs-on: ubuntu-latest
    outputs:
      verdict: ${{ steps.run.outcome }}
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }   # full history for diff
      - name: Compute selection
        id: pick
        run: |
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
          python scripts/select_tests.py --changed "$CHANGED" --map test-map.json > selection.txt
          echo "count=$(wc -l < selection.txt)" >> "$GITHUB_OUTPUT"
      - name: Run selected
        id: run
        run: xargs -a selection.txt npm test --

  shadow-full:
    if: github.run_attempt == 1 && (github.event.pull_request.number % 5 == 0)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm test
      - name: Compare with selected
        run: python scripts/compare_results.py selected.xml shadow.xml
```
