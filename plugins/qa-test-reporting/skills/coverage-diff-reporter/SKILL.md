---
name: coverage-diff-reporter
description: Builds a per-PR coverage delta report from any pair of LCOV / Cobertura / JSON coverage outputs (current run + baseline from the merge target) — emits a per-file table with line% / branch% deltas, called-out new files, hidden drops (overall +0.1pp but one file -8pp), and a single-line PR-comment summary. Use when the team has coverage in CI but needs human-readable PR feedback that points at the specific file the reviewer should focus on, not just an aggregate number.
rating: 24
d6: 4
archetype: S3
---

# coverage-diff-reporter

## Overview

A whole-repo coverage gate is necessary but not sufficient. A drop
of 0.4pp overall might hide a 12pp drop in one critical file. A
new file at 35% line coverage might pass an aggregate gate but
leave a regression-risk hot spot.

This skill **builds a coverage diff report** that solves the
"reviewer can see what to look at" problem:

1. Parse the current run's coverage (LCOV / Cobertura).
2. Parse a baseline from the merge target.
3. Emit a per-file delta table sorted by absolute drop.
4. Highlight new files below threshold, files with disproportionate
   drops, and files that gained coverage (positive feedback).
5. Post a single-line summary as the PR top-of-comment, with
   click-through to the full table.

## When to use

- A PR is missing reviewer signal about which file's coverage
  changed.
- The repo has coverage but no PR-time visualization (the data is in
  the artifacts but nobody opens them).
- A coverage SaaS isn't an option (compliance, cost) and the team
  wants a self-hosted equivalent.

This skill **does not** decide pass/fail — that's the gate's job
(see [`lcov-analysis`](../lcov-analysis/SKILL.md) or
[`cobertura-analysis`](../cobertura-analysis/SKILL.md) Step 5). This
skill just makes the diff legible.

## Step 1 — Pick the parser

Match the existing CI's reporter:

| Existing reporter           | Use                                                      |
|-----------------------------|----------------------------------------------------------|
| LCOV `.info`                | [`lcov-analysis`](../lcov-analysis/SKILL.md) parser      |
| Cobertura XML               | [`cobertura-analysis`](../cobertura-analysis/SKILL.md) parser |
| Jest JSON / V8 coverage     | Convert to LCOV first (`jest --coverageReporters=lcov`)  |
| JaCoCo XML                  | Use [`jacoco-analysis`](../jacoco-analysis/SKILL.md), or convert to Cobertura |
| coverage.py                 | `coverage xml` → Cobertura, OR `py2lcov` → LCOV          |

The reporter writes to `current.json` (parsed). The same parser
runs against the baseline → `baseline.json`.

## Step 2 — Get the baseline

Two patterns:

### Pattern A — cached artifact (recommended)

The main branch's last successful CI run uploaded its coverage as
an artifact. PR jobs download it.

```yaml
- name: Restore baseline
  uses: dawidd6/action-download-artifact@v3
  with:
    workflow: coverage.yml
    branch: main
    name: coverage-baseline
    path: baseline/

- name: Parse current
  run: python scripts/parse_lcov.py coverage/lcov.info > current.json

- name: Parse baseline
  run: python scripts/parse_lcov.py baseline/lcov.info > baseline.json

- name: Generate diff
  run: python scripts/coverage_diff.py current.json baseline.json > diff.md
```

### Pattern B — recompute the baseline in the PR job

The PR job checks out main, runs tests + coverage, then checks out
the PR head. Slower (~2x runtime) but always-fresh.

```yaml
- name: Checkout main
  run: git fetch origin main && git checkout origin/main

- name: Run tests on main
  run: npm test -- --coverage && cp coverage/lcov.info baseline.lcov

- name: Checkout PR head
  run: git checkout ${{ github.event.pull_request.head.sha }}

- name: Run tests on PR head
  run: npm test -- --coverage
```

Pattern A is the default. Pattern B is the fallback when artifact
retention has expired or main coverage is non-deterministic.

## Step 3 — Compute the per-file delta

```python
# scripts/coverage_diff.py
def compute_diff(current, baseline):
    base_idx = {f['path']: f for f in baseline}
    rows = []
    for f in current:
        b = base_idx.get(f['path'])
        line_now    = pct(f.get('lh', 0), f.get('lf', 0))
        branch_now  = pct(f.get('brh', 0), f.get('brf', 0))
        line_then   = pct(b.get('lh', 0), b.get('lf', 0)) if b else None
        branch_then = pct(b.get('brh', 0), b.get('brf', 0)) if b else None
        rows.append({
            'path': f['path'],
            'is_new': b is None,
            'line_now': line_now,    'line_delta':   delta(line_now, line_then),
            'branch_now': branch_now,'branch_delta': delta(branch_now, branch_then),
        })
    # Also catch deletions — files in baseline but not current.
    for path, b in base_idx.items():
        if path not in {f['path'] for f in current}:
            rows.append({'path': path, 'is_deleted': True, 'line_now': None, 'line_then': pct(b.get('lh', 0), b.get('lf', 0))})
    return rows
```

## Step 4 — Sort and classify

Reviewers care most about big drops. Sort by `line_delta` ascending
(most-negative first), with new sub-threshold files at the top:

```python
def classify(row):
    if row.get('is_deleted'):                      return 'deleted'
    if row.get('is_new') and row['line_now'] < 80: return 'new_below_threshold'
    if row.get('is_new'):                          return 'new_ok'
    if row['line_delta'] is not None and row['line_delta'] <= -5:   return 'regressed'
    if row['line_delta'] is not None and row['line_delta'] <  0:    return 'declined'
    if row['line_delta'] is not None and row['line_delta'] >  0:    return 'improved'
    return 'unchanged'
```

The thresholds (80% for new files, -5pp for regression) are tunable
per repo.

## Step 5 — Render the report

```markdown
## Coverage diff — `<sha>` vs `main` `<base-sha>`

**Overall:** line 84.2% (-0.3pp) | branch 71.5% (-0.1pp)
**Files changed:** 7 (3 regressed, 1 new, 2 improved, 1 deleted)

### ⚠ Regressions (4)

| File                                  | Line%       | Branch%     |
|---------------------------------------|-------------|-------------|
| `src/checkout/cart.ts`                | 65.4 (-12.8 ⬇) | 50.0 (-25.0 ⬇) |
| `src/checkout/promo.ts`               | 78.0 (-8.5 ⬇)  | 60.0 (-15.0 ⬇) |

### 🆕 New files (1)

| File                                  | Line%       | Branch%     |
|---------------------------------------|-------------|-------------|
| `src/checkout/discount-stack.ts`      | 35.0 (NEW, below 80% threshold) | 25.0 |

### ✅ Improvements (2)

| File                                  | Line%       | Branch%     |
|---------------------------------------|-------------|-------------|
| `src/orders/list.ts`                  | 92.0 (+4.5 ⬆) | 85.0 (+10.0 ⬆) |

### 🗑 Deleted (1)

| File                                  | Was line%   |
|---------------------------------------|-------------|
| `src/legacy/old-checkout.ts`          | 22.0        |
```

The four-section split (Regressions / New / Improvements / Deleted)
matches reviewer attention budget. Improvements get airtime —
positive feedback prevents the gate from feeling adversarial.

## Step 6 — One-line summary for the PR top

PR comment APIs render long markdown by default; the summary line
sits at the top so the reviewer doesn't have to scroll:

```
📉 Coverage 84.2% (-0.3pp) — 3 files regressed, 1 new file below threshold. See full report below.
```

Or if all-clear:

```
✅ Coverage 84.5% (+0.2pp) — no regressions, 2 files improved.
```

## Step 7 — Post to the PR

```yaml
- name: Generate diff report
  run: python scripts/coverage_diff.py current.json baseline.json > diff.md

- name: Post / update PR comment
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    header: coverage-diff
    path: diff.md
```

`sticky-pull-request-comment` uses the `header` to update the same
comment across pushes — the reviewer doesn't see N copies of the
report as the PR evolves.

## Anti-patterns

| Anti-pattern                                                      | Why it fails                                                                  | Fix |
|-------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Posting only the aggregate (overall ± Xpp)                        | Hides which file regressed; reviewer can't act.                              | Per-file table sorted by drop (Step 4–5). |
| One thread per push (new comment per commit)                      | PR conversation drowns in coverage churn; nobody reads.                      | Sticky comment updated in place (Step 7). |
| Showing every unchanged file                                       | 500-row tables; the 3 regressions are buried.                                | Filter to only changed files; one summary line for unchanged count. |
| Adversarial framing ("FAIL: coverage dropped")                    | Reviewer associates coverage tool with friction; team disables.              | Show improvements too (Step 5). Gate failures are the gate's job; this report is informational. |
| Using PR's merge-base coverage (re-runs main coverage)            | Doubles CI cost; flake risk on the main re-run.                              | Cache main coverage as artifact (Step 2 Pattern A). |
| Hiding new files because they "don't have a baseline"             | New files are exactly where regressions enter the codebase.                   | Always show new files; flag the sub-threshold ones explicitly (Step 4). |
| Ignoring deleted files                                              | Coverage went up because high-coverage code was deleted; aggregate misleads.  | Show deletions (Step 3); explain in summary if they cause aggregate movement. |

## Limitations

- **Per-line uncovered detail isn't shown.** This skill is the
  file-level summary; for per-line drilldown, generate the
  language-native HTML report (Allure / genhtml / `coverage html`).
- **No semantic awareness.** A 50% drop because the file got 2x
  bigger (more code, same number of tests) reads the same as a
  drop because tests were deleted. The reviewer still has to look.
- **Sub-1pp deltas are noise.** Coverage tools have measurement
  jitter from non-deterministic test ordering; show only deltas
  above a threshold (typical: ±0.5pp).
- **Baseline staleness.** Pattern A assumes main's last coverage
  artifact is recent. If main is stale, surface the baseline age
  in the report header.

## References

- [`lcov-analysis`](../lcov-analysis/SKILL.md) — LCOV parser this
  skill consumes.
- [`cobertura-analysis`](../cobertura-analysis/SKILL.md) — Cobertura
  parser this skill consumes.
- [`jest-coverage-analysis`](../jest-coverage-analysis/SKILL.md),
  [`jacoco-analysis`](../jacoco-analysis/SKILL.md),
  [`coverage-py-analysis`](../coverage-py-analysis/SKILL.md) —
  language-specific parsers; convert to LCOV / Cobertura before
  feeding this skill.
- [`unit-test-coverage-targeter`](../unit-test-coverage-targeter/SKILL.md)
  — downstream skill that reads the same data to suggest which
  uncovered branches to target next.
