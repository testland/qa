---
name: coverage-debt-tracker
description: "Builds a per-file coverage-debt ledger by walking N runs of historical coverage data - flags files whose line% / branch% has slid more than M pp over the period (`falling`), files whose coverage hasn't moved while their churn has (`stale`), and files that lost their last covering test (`orphan`). Emits a sorted backlog the team can ratchet down: each PR fixes one or two debt items, the rest stays visible. Use when whole-repo coverage is \"fine\" but specific modules are eroding silently and the team needs a stack-ranked list to fix."
---

# coverage-debt-tracker

## Overview

Aggregate coverage hides per-file decay. A repo can sit at 82%
overall while the payment module silently drops from 95% to 60%
across 30 PRs - none of which individually crossed a gate threshold.

This skill builds a **debt ledger** from a rolling window of
historical coverage data, scoring each file on three axes:

| Axis           | Signal                                                  |
|----------------|---------------------------------------------------------|
| **Falling**    | line% (or branch%) dropped >M pp over the last N runs.  |
| **Stale**      | Coverage flat while churn (commits / week) is high.    |
| **Orphan**     | Lost its last covering test (every covering test was deleted). |

Output is a stack-ranked backlog: 5 - 20 items that, when fixed, would
restore the coverage health of the highest-risk modules.

## When to use

- Whole-repo coverage gates pass but specific modules are visibly
  eroding (anecdotally; the data isn't surfaced).
- Quarterly test-debt sprints need a prioritized list.
- A new owner joins a module and wants to understand the coverage
  history.

This skill is **read-only and informational** - it doesn't gate.
Pair with `test-coverage-targeter` (in the qa-test-reporting plugin)
to convert backlog items into specific test-target recommendations.

## Step 1 - Persist coverage history

Each main-branch CI run uploads its parsed coverage as
`coverage-history/<sha>-<timestamp>.json`. The schema:

```json
{
  "sha": "abc1234",
  "timestamp": "2026-05-05T14:00:00Z",
  "files": [
    { "path": "src/checkout/cart.ts", "line_pct": 78.4, "branch_pct": 65.0 },
    ...
  ]
}
```

Retention: ~90 days is enough to catch quarterly drift. The data
volume is tiny (~50 KB per main run for a 500-file repo).

**Verify:** assert `coverage-history/` exists and holds at least 2 non-empty
runs (`ls coverage-history/*.json | wc -l` >= 2) before proceeding; with
fewer runs there is no window to diff. If it fails, upload more main runs and
re-run.

## Step 2 - Detect `falling` files

```python
# scripts/coverage_debt.py
from collections import defaultdict

FALL_THRESHOLD_PP = 5.0   # 5 percentage points
WINDOW_RUNS = 30

def detect_falling(history):
    """history = chronological list of {sha, timestamp, files: [{path, line_pct, ...}]}"""
    by_path = defaultdict(list)
    for run in history[-WINDOW_RUNS:]:
        for f in run['files']:
            by_path[f['path']].append((run['sha'], run['timestamp'], f['line_pct']))

    falling = []
    for path, series in by_path.items():
        if len(series) < 2: continue
        peak = max(p for _, _, p in series)
        latest = series[-1][2]
        drop = peak - latest
        if drop >= FALL_THRESHOLD_PP:
            peak_sha = next(s for s, _, p in series if p == peak)
            falling.append({
                'path': path,
                'peak_pct': peak,
                'peak_sha': peak_sha,
                'now_pct': latest,
                'drop_pp': drop,
            })
    return sorted(falling, key=lambda x: x['drop_pp'], reverse=True)
```

The peak-vs-now comparison catches gradual erosion better than
last-vs-now; a sequence of small drops (-1pp, -1pp, -1pp...) doesn't
cross any individual gate but adds up.

## Step 3 - Detect `stale` files (high churn, flat coverage)

```python
import subprocess

def git_churn(path, days=90):
    out = subprocess.run(
        ['git', 'log', f'--since={days} days ago', '--format=', '--', path],
        capture_output=True, text=True,
    )
    return len([l for l in out.stdout.splitlines() if l])

def detect_stale(history, churn_threshold=10):
    by_path = defaultdict(list)
    for run in history[-WINDOW_RUNS:]:
        for f in run['files']:
            by_path[f['path']].append(f['line_pct'])

    stale = []
    for path, series in by_path.items():
        if len(series) < 2: continue
        coverage_variance = max(series) - min(series)
        churn = git_churn(path)
        if coverage_variance < 1.0 and churn >= churn_threshold:
            stale.append({
                'path': path,
                'now_pct': series[-1],
                'commits_last_90d': churn,
            })
    return sorted(stale, key=lambda x: x['commits_last_90d'], reverse=True)
```

Stale = "coverage hasn't moved" while "the file is being changed
often." Either:
- The new code isn't being tested (most common).
- The new code is tested but the old code that was removed had
  coverage too (rare; coverage usually moves at all when files
  change).

Either way, it's a flag for human review.

## Step 4 - Detect `orphan` files (lost last covering test)

Requires the per-test → source map (see
`regression-suite-selector`
Step 2):

```python
def detect_orphans(test_map_now, test_map_then):
    """A file is orphaned if every test that used to cover it was deleted."""
    live_tests = {t for tests in test_map_now.values() for t in tests}
    orphans = []
    for path, tests_then in test_map_then.items():
        if test_map_now.get(path): continue   # still has covering tests
        deleted_tests = [t for t in tests_then if t not in live_tests]
        if len(deleted_tests) == len(tests_then):
            orphans.append({
                'path': path,
                'lost_tests': tests_then,
            })
    return orphans
```

Orphans are urgent - the file currently has 0% coverage but the
aggregate may still look fine because the file is small.

## Step 5 - Render the ledger

Group the flagged files into one stack-ranked backlog, highest-risk first:

**orphan → falling (>10pp) → falling (5-10pp) → stale**

Each row shows the absolute % alongside the drop (100% → 95% is less urgent
than 60% → 55%), and orphans list the deleted tests. Full markdown table
template, worked example, and per-class recommended actions:
[references/ledger-rendering-and-ci.md](references/ledger-rendering-and-ci.md).

## Step 6 - CI shape

The tracker runs weekly on a schedule (informational, not gating) and opens /
refreshes one GitHub issue so debt history stays visible across weeks. Check
out with `fetch-depth: 0` so git churn (Step 3) has full history. Ready-to-use
workflow: [references/ledger-rendering-and-ci.md](references/ledger-rendering-and-ci.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                                  | Fix |
|-----------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Treating coverage debt as gating                                      | Refactors that legitimately remove dead code add a "drop" item; team disables. | Informational only (Step 6). |
| Last-run-vs-now comparison                                            | Misses gradual erosion (small drops add up).                                  | Peak-vs-now (Step 2). |
| Pure-percentage threshold without context                             | Files at 100% that drop to 95% flag as severely as files at 60% → 55%.       | Surface absolute % alongside drop; review with file owner. |
| Per-PR debt comment                                                   | Conflates "regression in this PR" (gate's job) with "drift over time" (debt's job). | Weekly cadence; one ledger issue, not per-PR. |
| Including test files in the ledger                                    | Test file churn doesn't matter for coverage debt.                            | Filter to source paths (`src/**`, not `tests/**` / `*.test.*`). |
| Missing churn data → false stale detection                            | Shallow `actions/checkout` lacks history; every file looks low-churn.        | `fetch-depth: 0` (Step 6). |
| Fixed 30-run window without seasonality                               | Codebases with mixed cadence (sprint-driven crunch) skew the window.         | Document the window; let the team override per project. |

## Limitations

- **Requires history retention.** Without `coverage-history/` files,
  the tracker has nothing to track. Bootstrap by uploading every
  main run for 30 days before the first ledger.
- **Coverage doesn't equal correctness.** A file at 90% with 0
  branch coverage on the failure path is debt the line% doesn't
  show. Pair with branch% trend.
- **Orphan detection requires per-test maps.** Without them,
  orphans are invisible. Build the map per the
  `regression-suite-selector`
  Step 2 path.
- **Doesn't recommend specific tests.** This skill flags WHICH
  files; `test-coverage-targeter`
  recommends WHAT to test inside them.

## References

- `regression-suite-selector` - sibling: builds the per-test → source map this skill consumes
  for orphan detection.
- `test-coverage-targeter` - downstream: converts a debt-ledger entry into specific
  test-target recommendations.
- `coverage-diff-reporter` - sibling: per-PR coverage comment (different cadence; same data).
- `lcov-analysis`,
  `cobertura-analysis` - upstream parsers that produce the historical data this skill
  walks.
