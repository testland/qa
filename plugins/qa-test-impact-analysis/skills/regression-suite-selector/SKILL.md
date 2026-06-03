---
name: regression-suite-selector
description: "Builds a CI workflow that runs only the subset of tests impacted by a PR's changes - combines a per-test → source-file dependency map (built from coverage profiles or, in build-graph projects, queried from the build system itself like Bazel `rdeps`) with the PR's `git diff --name-only`, then selects the union of (impacted by changed files + previously failing + newly added). Always pairs with a periodic full-suite run so a misconfigured map can't silently shrink coverage. Use when the regression suite is large enough that PR-time CI is the bottleneck and a full run is reserved for nightly / pre-release."
rating: 24
d6: 4
---

# regression-suite-selector

## Overview

Per [tia-fowler][tia], **Test Impact Analysis (TIA)** is the
technique of identifying "which tests should execute following code
changes by analyzing the relationship between production source code
and test coverage." The bidirectional shape:

[tia]: https://martinfowler.com/articles/rise-test-impact-analysis.html

> "One test (from many) exercises a subset of the production
> sources" and conversely, "One prod source is exercised by a subset
> of the tests." ([tia-fowler][tia])

Microsoft has invested in TIA since 2009 ([tia-fowler][tia]); their
Azure Pipelines implementation collects per-test dynamic
dependencies during execution and stores mappings like
`Testcasemethod1 <--> a.cs, b.cs, d.cs` ([tia-fowler][tia]).
Google's Blaze (Bazel's predecessor) uses static build-graph
declarations to achieve the same selection.

This skill builds a TIA-style selector for any team - without
requiring Microsoft's tooling - by stitching together coverage data,
git diff, and a fallback policy.

## When to use

- The regression suite takes >10 min on a PR; CI is the development
  bottleneck.
- A nightly / pre-release full run exists and can serve as the safety
  net for selection misses.
- The team has coverage instrumentation (per
  [`lcov-analysis`](../../../qa-test-reporting/skills/lcov-analysis/SKILL.md),
  [`jest-coverage-analysis`](../../../qa-test-reporting/skills/jest-coverage-analysis/SKILL.md),
  etc.) - the per-test → source map is computable from it.

If the build is a Bazel / Pants / Buck monorepo, the selection
already comes from the build graph (Step 5) and this skill is
mostly orchestration around it.

## Step 1 - Decide the selection policy

Per [tia-azure][azure], a robust selector includes "existing
impacted tests, **previously failing tests**, and **newly added
tests**" - and falls back to running **all tests** when it
encounters changes it can't reason about:

[azure]: https://learn.microsoft.com/en-us/azure/devops/pipelines/test/test-impact-analysis

> "Safe fallback. For commits and scenarios that TIA can't
> understand, it falls back to running all tests." ([tia-azure][azure])

The selection set per PR:

```
impacted ∪ previously_failing ∪ newly_added ∪ (FALLBACK if any change is unmappable)
```

Hard-coded **fallback triggers** (run everything):

- Build config changes (`pom.xml`, `package.json`, `Cargo.toml`,
  `requirements.txt`, `Dockerfile`).
- CI workflow changes.
- Files outside the source-coverage map (a new asset type the map
  doesn't know about).
- N PRs since the last full run (configurable; default: every 5
  PRs to a branch).

Match the safety bar Microsoft documents: TIA is "currently scoped
to only managed code, and single machine topology. So, for example,
if the code commit contains changes to HTML or CSS files, it can't
reason about them and falls back to running all tests"
([tia-azure][azure]).

## Step 2 - Build the per-test → source map

Two paths:

### Path A - From coverage data (any framework)

Modify the test runner to emit per-test coverage instead of merged
coverage:

- Jest: `--coverage` writes `coverage/coverage-final.json` already
  with per-test `f` (function-hit) maps if the runner is configured
  for it; or use `jest-coverage-tracking` for per-test data.
- pytest + coverage.py: `coverage run --concurrency=multiprocessing -m pytest --cov-context=test`
  emits per-test contexts.
- Java + JaCoCo: per-test "session" mode (`destfile=...sessionId=<test>.exec`).

Then build the map:

```python
# scripts/build_test_map.py
def build_map(per_test_coverage):
    """returns {file_path: [test_id, ...]}"""
    inverted = defaultdict(list)
    for test_id, coverage in per_test_coverage.items():
        for file_path, hits in coverage.items():
            if any(h > 0 for h in hits):
                inverted[file_path].append(test_id)
    return dict(inverted)
```

Persist as `test-map.json` checked into the repo or stored as a CI
artifact updated on every main run.

### Path B - From the build graph (Bazel / Pants / Buck)

In Bazel projects, the dependency graph IS the test-source map:

```bash
# What tests depend on changed files?
bazel query 'kind("_test", rdeps(//..., set(<changed-files>)))'
```

Per [bazel-deps][bz]: a Bazel target "is _actually dependent_ on
target Y if Y must be present, built, and up-to-date in order for X
to be built correctly." `rdeps(<scope>, <target>)` reverses the edge
and finds targets that depend on `<target>`.

[bz]: https://bazel.build/concepts/dependencies

```bash
CHANGED=$(git diff --name-only origin/main...HEAD | sed 's|^|//|')
bazel query "kind('_test', rdeps(//..., set(${CHANGED})))" \
  | xargs bazel test
```

Per [bazel-deps][bz]: "declared dependencies must comprehensively
cover actual dependencies to ensure correct incremental rebuilds" - 
which means the build-graph approach is only as good as the BUILD
file discipline. Lint via `buildozer` / `gazelle` to catch missing
declarations.

## Step 3 - Compute the changed-file set

```bash
git diff --name-only origin/${{ github.base_ref }}...HEAD
```

Important: **`...` (three dots), not `..`**. Three-dot diff is "what
changed on this branch since it diverged from main", which matches
PR semantics. Two-dot diff is "differences vs current main HEAD"
which can show changes the PR didn't make if main moved forward.

## Step 4 - Combine

```python
def select_tests(map, changed_files, previously_failing, newly_added):
    impacted = set()
    for f in changed_files:
        if f in map:
            impacted.update(map[f])
        else:
            return ('FALLBACK', f)   # unknown file type
    return ('SELECTED', impacted | previously_failing | newly_added)
```

`previously_failing` comes from the most recent full-suite run on
main (CI artifact). `newly_added` comes from
`git diff --diff-filter=A --name-only` filtered to test files.

## Step 5 - Add safety: periodic full run + drift detection

Per [tia-azure][azure]:

> "Run TIA selected tests and then all tests in sequence. In a build
> pipeline, use two test tasks - one that runs only impacted Tests
> (T1) and one that runs all tests (T2). If T1 passes, check that T2
> passes as well. If there was a failing test in T1, check that T2
> reports the same set of failures."

Two safety patterns:

### Pattern A - Nightly full-suite run

Cron a full-suite job nightly. Failures here that didn't appear in
PR runs reveal selection misses; investigate and update the map.

### Pattern B - N-th PR full run

Every N-th PR (e.g. every 5th, configurable) runs the full suite as
a "shadow" - silently if it agrees with selection; a warning issue
if it doesn't.

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

## Step 6 - Surface the selection

PR-comment summary so reviewers know what ran:

```markdown
## Test Impact Analysis — `<sha>`

**Selected:** 47 tests of 1,283 total (3.7%)
**Strategy:** impacted ∪ previously_failing ∪ newly_added
**Reason for selection:**

| Source              | Tests added |
|---------------------|------------:|
| Impacted by changes |          39 |
| Previously failing   |           5 |
| Newly added          |           3 |

**Files driving impacted set:**
- `src/checkout/cart.ts` → 12 tests
- `src/checkout/promo.ts` → 18 tests
- `src/api/orders.ts` → 9 tests

**Last full-suite run:** 2026-05-04 22:00 UTC (12 hours ago) — passed.
```

## Step 7 - Configurable overrides

Per [tia-azure][azure], the team should be able to **opt out** for
a specific build:

> "By setting a build variable. Even after TIA is enabled in the
> VSTest task, you can disable it for a specific build by setting
> the variable DisableTestImpactAnalysis to true."

Implement:

- **PR label `run-all-tests`** → forces full suite for that PR.
- **Path filter `tia-include`** → only consider TIA for changes
  matching this pattern (matches Azure's `TIA_IncludePathFilters`
  per [tia-azure][azure]).
- **PR title `[full-suite]`** → forces full suite.

## Anti-patterns

| Anti-pattern                                                              | Why it fails                                                                  | Fix |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Selection without periodic full-suite safety net                          | Map staleness causes missed coverage; bugs ship.                              | Pattern A or B (Step 5). |
| `git diff origin/main..HEAD` (two dots)                                    | Picks up commits that landed on main after the PR diverged; selection is wrong. | Use three dots (Step 3). |
| Treating an empty map result as "no impacted tests" → run nothing          | A new file type (e.g. `*.proto`) isn't in the map → selector returns nothing → bugs ship. | Fallback to full suite (Step 1). |
| Skipping `previously_failing` from the union                               | Flaky / known-broken tests don't run; the broken state is invisible.         | Always include the previously-failing set (Step 4). |
| Map updated only on full-suite runs that succeed                           | A failing full-suite run doesn't update the map → next PR uses stale data.   | Update the map on every full run regardless of pass/fail (the data is still valid). |
| One global map for a multi-language repo                                   | Per-language coverage tools emit different test IDs; the map merges incorrectly. | Per-language maps + per-language selectors; combine selections, not maps. |
| Selecting only "impacted" without "newly_added"                             | A new test file with no map entry never runs in PR.                          | Detect new test files via `git diff --diff-filter=A` (Step 4). |
| Hard-coded 5-PR full-run cadence with no opt-out                           | A user with 50-PR streak runs full suite 10× even if they're trivial.       | Optional `[full-suite]` PR title override (Step 7). |

## Limitations

- **Map quality bounds selection quality.** A map missing edges =
  missed tests. Update on every main full run.
- **Build-config / CI-config / dependency changes are unmappable.**
  The fallback rule (Step 1) is non-negotiable.
- **Per-test coverage instrumentation has overhead.** ~30 - 60% slower
  than merged coverage. Run on main only; PRs use the artifact.
- **Multi-machine topologies break the mapping.** Per [tia-azure][azure],
  Microsoft's TIA is "single machine topology" only - the same
  applies here unless the test/SUT topology is captured in the map.
- **Doesn't fix slow tests.** Selection cuts the count; per-test
  speed is still on the team. Pair with
  [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md)
  for the "what to add next" side.

## References

- [tia-fowler][tia] - Hammant + Fowler on Test Impact Analysis:
  bidirectional mapping, Microsoft's investment since 2009, Google
  Blaze approach.
- [tia-azure][azure] - Azure Pipelines TIA: selection mechanism,
  safe fallback, configurable overrides, what's NOT supported (data
  driven tests, multi-machine, .NET Core, UWP), the "Run TIA + run
  all in sequence" comparison pattern.
- [bazel-deps][bz] - Bazel target dependency model, `rdeps` reverse
  dependency query, declared-vs-actual dependency principle.
- [`coverage-debt-tracker`](../coverage-debt-tracker/SKILL.md) - 
  sibling skill: tracks files that lost coverage / went stale.
- [`test-suite-pruner`](../../agents/test-suite-pruner.md) and
  [`regression-suite-curator`](../../agents/regression-suite-curator.md) - agents that prune the suite this selector runs against.
