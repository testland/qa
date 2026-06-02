---
name: coverage-debt-tracker
description: "Builds a per-file coverage-debt ledger by walking N runs of historical coverage data - flags files whose line% / branch% has slid more than M pp over the period (`falling`), files whose coverage hasn't moved while their churn has (`stale`), and files that lost their last covering test (`orphan`). Emits a sorted backlog the team can ratchet down: each PR fixes one or two debt items, the rest stays visible. Use when whole-repo coverage is \"fine\" but specific modules are eroding silently and the team needs a stack-ranked list to fix."
rating: 23
d6: 3
archetype: S3
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
Pair with [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md)
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
[`regression-suite-selector`](../regression-suite-selector/SKILL.md)
Step 2):

```python
def detect_orphans(test_map_now, test_map_then):
    """A file is orphaned if every test that used to cover it was deleted."""
    orphans = []
    for path, tests_then in test_map_then.items():
        tests_now = test_map_now.get(path, [])
        if tests_now: continue   # still has covering tests
        deleted_tests = [t for t in tests_then if t not in all_tests_now()]
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

```markdown
## Coverage debt ledger — `<branch>`, last 30 main runs (~30 days)

**Total flagged:** 12 files
**Backlog priority:** orphan → falling (>10pp) → falling (5-10pp) → stale

### 🔴 Orphans (3) — currently 0% coverage; lost all covering tests

| File                                        | Lost tests                                                  | Path              |
|---------------------------------------------|-------------------------------------------------------------|-------------------|
| `src/api/promo.ts`                          | `promo.spec.ts.applies_lowercase`, `promo.spec.ts.expires`  | Test file deleted in `def456` (30 days ago); never replaced. |
| `src/utils/parseDate.ts`                    | `parseDate.spec.ts.iso_format`                              | Test file moved; new path doesn't import the util. |

### 🟠 Falling >10pp (4)

| File                                        | Peak%                  | Now% | Drop  |
|---------------------------------------------|-----------------------:|-----:|------:|
| `src/checkout/cart.ts`                       | 95.2 (`abc123`, day -25) | 65.4 | -29.8 |
| `src/checkout/discount.ts`                   | 88.0 (`def456`, day -19) | 71.0 | -17.0 |
| `src/api/orders.ts`                          | 79.5 (`ghi789`, day -8)  | 65.0 | -14.5 |

### 🟡 Falling 5-10pp (3)

(table)

### 🔵 Stale, high churn (2)

| File                                        | Coverage% | Commits last 90d |
|---------------------------------------------|----------:|-----------------:|
| `src/api/payments.ts`                        |      72.0 |               18 |
| `src/checkout/promo-stack.ts`                |      68.0 |               12 |

## Recommended actions

For each orphan: write 1 test that re-covers the file (run with the
file's name in the search; if the test runner doesn't show it as
covered, the file may be unreachable / dead code).

For each falling file: pair with [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md)
to identify the specific uncovered branches.

For each stale file: review with the file owner — is the new code
actually being tested? Often the test suite covers happy paths but
not the edge cases the recent commits added.
```

## Step 6 - CI shape

The debt tracker runs on a schedule, not per-PR (it's
informational, not gating):

```yaml
# .github/workflows/coverage-debt.yml
name: coverage-debt
on:
  schedule:
    - cron: '0 12 * * MON'   # Monday noon UTC; weekly review
  workflow_dispatch:

jobs:
  ledger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }   # for git churn

      - name: Restore coverage history
        uses: actions/download-artifact@v4
        with:
          name: coverage-history
          path: coverage-history/

      - name: Build ledger
        run: python scripts/coverage_debt.py coverage-history/ > LEDGER.md

      - name: Open / update GitHub issue
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Coverage debt ledger — week of ${{ github.event.repository.updated_at }}'
          content-filepath: LEDGER.md
          labels: tech-debt, coverage
```

The issue gets refreshed weekly. Items the team fixed drop off; new
items appear. The same issue title (with date) makes the history
of debt visible across weeks.

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
  [`regression-suite-selector`](../regression-suite-selector/SKILL.md)
  Step 2 path.
- **Doesn't recommend specific tests.** This skill flags WHICH
  files; [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md)
  recommends WHAT to test inside them.

## References

- [`regression-suite-selector`](../regression-suite-selector/SKILL.md) - sibling: builds the per-test → source map this skill consumes
  for orphan detection.
- [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md) - downstream: converts a debt-ledger entry into specific
  test-target recommendations.
- [`coverage-diff-reporter`](../../../qa-test-reporting/skills/coverage-diff-reporter/SKILL.md) - sibling: per-PR coverage comment (different cadence; same data).
- [`lcov-analysis`](../../../qa-test-reporting/skills/lcov-analysis/SKILL.md),
  [`cobertura-analysis`](../../../qa-test-reporting/skills/cobertura-analysis/SKILL.md) - upstream parsers that produce the historical data this skill
  walks.
