---
name: regression-suite-selector
description: "Builds a CI workflow that runs only the subset of tests impacted by a PR's changes - combines a per-test → source-file dependency map (built from coverage profiles or, in build-graph projects, queried from the build system itself like Bazel `rdeps`) with the PR's `git diff --name-only`, then selects the union of (impacted by changed files + previously failing + newly added). Always pairs with a periodic full-suite run so a misconfigured map can't silently shrink coverage. Use when the regression suite is large enough that PR-time CI is the bottleneck and a full run is reserved for nightly / pre-release."
---

# regression-suite-selector

## Overview

**Test Impact Analysis (TIA)** runs only the tests a change can affect: map
production sources to the tests that exercise them, then intersect that map
with the PR diff ([tia-fowler][tia]). The map is bidirectional - one test
exercises a subset of sources; one source is exercised by a subset of tests.
Azure Pipelines builds it from per-test dynamic dependencies; Bazel derives it
statically from the build graph ([tia-azure][azure]).

[tia]: https://martinfowler.com/articles/rise-test-impact-analysis.html

This skill builds a TIA-style selector for any team - stitching coverage data,
git diff, and a safe fallback policy - without vendor tooling.

## When to use

- The regression suite takes >10 min on a PR; CI is the development
  bottleneck.
- A nightly / pre-release full run exists and can serve as the safety
  net for selection misses.
- The team has coverage instrumentation (`lcov-analysis`, etc., in
  the qa-test-reporting plugin, or `js-unit-tests` in
  qa-unit-tests-js) - the per-test → source map is computable from it.

If the build is a Bazel / Pants / Buck monorepo, the selection
already comes from the build graph (Step 5) and this skill is
mostly orchestration around it.

## Step 1 - Decide the selection policy

A robust selector runs impacted + previously-failing + newly-added tests, and
falls back to the full suite for any change it can't map ([tia-azure][azure]).

[azure]: https://learn.microsoft.com/en-us/azure/devops/pipelines/test/test-impact-analysis

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

Azure's TIA reasons only about managed code on a single machine; it can't
reason about HTML / CSS changes and falls back to running all tests
([tia-azure][azure]).

## Step 2 - Build the per-test → source map

Emit per-test coverage (not merged), then invert it into a file → tests map.
The core inversion:

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

Persist as `test-map.json`, checked into the repo or stored as a CI artifact
updated on every main run. Per-framework recipes for emitting per-test
coverage (Jest, pytest + coverage.py, JaCoCo) and the Bazel / Pants / Buck
build-graph path (where `rdeps` gives the map directly) live in
[references/instrumentation-and-ci.md](references/instrumentation-and-ci.md).

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

Pair selection with a full-suite run so a stale map can't silently shrink
coverage. Azure's pattern: run selected tests (T1) and all tests (T2) in
sequence and confirm T2 reports the same result as T1 ([tia-azure][azure]).

- **Pattern A - Nightly full-suite run.** Cron a full-suite job nightly.
  Failures that didn't appear in PR runs reveal selection misses; investigate
  and update the map.
- **Pattern B - N-th PR full run.** Every N-th PR (e.g. every 5th,
  configurable) runs the full suite as a "shadow" - silent if it agrees with
  selection, a warning issue if it doesn't.

CI workflow (selected run + shadow full run):
[references/instrumentation-and-ci.md](references/instrumentation-and-ci.md).

## Step 6 - Surface the selection

PR-comment summary so reviewers know what ran:

```markdown
## Test Impact Analysis - `<sha>`

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

**Last full-suite run:** 2026-05-04 22:00 UTC (12 hours ago) - passed.
```

## Step 7 - Configurable overrides

The team should be able to opt out for a specific build, matching Azure's
`DisableTestImpactAnalysis` build-variable escape hatch ([tia-azure][azure]):

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
  `test-coverage-targeter`
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
- `test-coverage-targeter` (qa-test-reporting) - its coverage debt
  ledger tracks files that lost coverage / went stale.

[bz]: https://bazel.build/concepts/dependencies
