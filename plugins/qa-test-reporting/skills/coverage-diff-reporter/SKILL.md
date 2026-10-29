---
name: coverage-diff-reporter
description: "Use when a pull request needs readable coverage feedback rather than one total. Compares current and baseline coverage (LCOV, Cobertura or JSON) and reports per-file line and branch deltas, new files and hidden drops, with a one-line summary for the PR comment."
---

# coverage-diff-reporter

## Overview

An aggregate coverage number hides where coverage moved: -0.4pp overall
can be one file at -12pp. This skill turns two parsed coverage runs
(PR head and merge-target baseline) into a per-file delta report and a
one-line PR summary. It does **not** decide pass/fail; the gate in
`lcov-analysis` does that. This skill makes the diff legible.

Inputs: the current run's LCOV or Cobertura file and the baseline's.
Output: `diff.md` (full report) posted as one sticky PR comment.

## Step 1 - Parse both runs with the same parser

Use the parser from `lcov-analysis` (its "Parse" section; Cobertura
parser in its `references/cobertura.md`), saved in your repo as
`scripts/parse_lcov.py` or `scripts/parse_cobertura.py`. Each emits a
list of per-file dicts with `path`, `lf`, `lh`, `brf`, `brh` - the LCOV
`LF`/`LH` (lines found / hit) and `BRF`/`BRH` (branches found / hit)
counters ([lcov][lcov]).

| Existing reporter       | Use                                                     |
|-------------------------|---------------------------------------------------------|
| LCOV `.info`            | `lcov-analysis` LCOV parser                             |
| Cobertura XML           | `lcov-analysis` Cobertura parser (`references/cobertura.md`) |
| Jest / V8 coverage      | Emit LCOV first (`jest --coverageReporters=lcov`)       |
| JaCoCo XML              | `jacoco-analysis`, or convert to Cobertura              |
| coverage.py             | `coverage xml` (Cobertura) or `coverage lcov` (LCOV)    |

Run the same parser on both files, so both sides use identical path
and counting rules.

## Step 2 - Get the baseline

**Pattern A (default) - cached artifact.** The merge target's last
green CI run uploads its coverage file; the PR job downloads it with
[`dawidd6/action-download-artifact`][dl] (`workflow`, `branch` and
`name` select the run and artifact; `if_no_artifact_found` defaults to
`fail`):

```yaml
- name: Restore baseline
  uses: dawidd6/action-download-artifact@v3
  with:
    workflow: coverage.yml
    branch: main
    name: coverage-baseline
    path: baseline/
    if_no_artifact_found: warn

- name: Parse both runs
  run: |
    python scripts/parse_lcov.py coverage/lcov.info > current.json
    python scripts/parse_lcov.py baseline/lcov.info > baseline.json
```

**Pattern B (fallback) - recompute.** Check out the merge target, run
the tests with coverage, save the file, then check out the PR head and
run again. About twice the runtime; use it when the artifact has
expired or the baseline run is not deterministic.

## Step 3 - Check the inputs before diffing

Stop and fix the inputs if any check fails; a diff of bad inputs is
worse than no report.

1. Both JSON files exist and hold at least one file entry. If the
   baseline is missing (Pattern A warned), post "no baseline - report
   skipped" instead of a diff that shows every file as new.
2. Paths use the same root on both sides. If more than half of the
   current files have no baseline match, the paths differ (absolute vs
   repo-relative, different checkout dirs): strip the common prefix and
   re-run.
3. Record the baseline commit and its age; print both in the report
   header (Step 6).

## Step 4 - Compute the per-file delta

```python
# scripts/coverage_diff.py
def pct(hit, found):
    return round(100.0 * hit / found, 1) if found else None

def delta(now, then):
    return None if now is None or then is None else round(now - then, 1)

def compute_diff(current, baseline):
    base_idx = {f['path']: f for f in baseline}
    cur_paths = {f['path'] for f in current}
    rows = []
    for f in current:
        b = base_idx.get(f['path'])
        line_now, branch_now = pct(f['lh'], f['lf']), pct(f['brh'], f['brf'])
        line_then = pct(b['lh'], b['lf']) if b else None
        branch_then = pct(b['brh'], b['brf']) if b else None
        rows.append({'path': f['path'], 'is_new': b is None,
                     'line_now': line_now, 'line_delta': delta(line_now, line_then),
                     'branch_now': branch_now, 'branch_delta': delta(branch_now, branch_then)})
    for path, b in base_idx.items():          # deleted files
        if path not in cur_paths:
            rows.append({'path': path, 'is_deleted': True,
                         'line_then': pct(b['lh'], b['lf'])})
    return rows
```

## Step 5 - Classify and sort

```python
NEW_FILE_MIN, REGRESSION_PP, NOISE_PP = 80, -5, 0.5   # tune per repo

def classify(row):
    if row.get('is_deleted'):
        return 'deleted'
    if row['is_new']:
        return 'new_below_threshold' if (row['line_now'] or 0) < NEW_FILE_MIN else 'new_ok'
    d = row['line_delta']
    if d is None or abs(d) < NOISE_PP:
        return 'unchanged'
    return 'regressed' if d <= REGRESSION_PP else 'declined' if d < 0 else 'improved'
```

Sort regressions by `line_delta` ascending (largest drop first) and put
new below-threshold files at the top. Leave `unchanged` rows out of the
tables; report only their count. `NOISE_PP` hides the sub-0.5pp jitter
that test-order non-determinism produces.

## Step 6 - Render the report

```markdown
## Coverage diff - `<sha>` vs `main` `<base-sha>` (baseline 2 h old)

**Overall:** line 84.2% (-0.3pp) | branch 71.5% (-0.1pp)
**Files changed:** 7 (3 regressed, 1 new, 2 improved, 1 deleted); 412 unchanged

### Regressions (3)
| File | Line% | Branch% |
|---|---|---|
| `src/checkout/cart.ts` | 65.4 (-12.8) | 50.0 (-25.0) |

### New files (1)
| File | Line% | Branch% |
|---|---|---|
| `src/checkout/discount-stack.ts` | 35.0 (below 80%) | 25.0 |

### Improvements (2)
| File | Line% | Branch% |
|---|---|---|
| `src/orders/list.ts` | 92.0 (+4.5) | 85.0 (+10.0) |

### Deleted (1)
| File | Was line% |
|---|---|
| `src/legacy/old-checkout.ts` | 22.0 |
```

Keep improvements in the report: a report that only scolds gets
disabled. Put a one-line summary above the tables so the reviewer sees
it without scrolling:

```
Coverage 84.2% (-0.3pp) - 3 files regressed, 1 new file below threshold.
```

## Step 7 - Post to the PR and verify

```yaml
- name: Generate diff report
  run: python scripts/coverage_diff.py current.json baseline.json > diff.md

- name: Post / update PR comment
  uses: marocchino/sticky-pull-request-comment@v3
  with:
    header: coverage-diff
    path: diff.md
```

[`sticky-pull-request-comment`][sticky] uses `header` to find and
update its own earlier comment, so each push edits one comment instead
of adding another. After the first run, open the PR and confirm exactly
one coverage comment exists and its header shows the expected baseline
SHA; if not, fix the `header` value or the Step 3 path check and re-run
the job.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Posting only the aggregate | Hides which file regressed | Per-file table sorted by drop (Steps 4-5) |
| A new comment per push | PR thread drowns in coverage churn | Sticky comment updated in place (Step 7) |
| Showing every unchanged file | 500-row tables bury the 3 regressions | Count unchanged files, list only changed ones |
| Diffing without the Step 3 checks | A path-root mismatch shows every file as new | Check inputs first |
| Hiding new files ("no baseline") | New files are where untested code enters | Always list them; flag sub-threshold ones |
| Ignoring deleted files | Deleting well-covered code moves the aggregate | List deletions |

## Limitations

- File level only. For per-line detail, link the HTML report
  (`genhtml`, `coverage html`).
- No semantic awareness: a file that doubled in size with the same
  tests reads like a file that lost tests.
- Pattern A depends on artifact retention; Step 3 surfaces a stale or
  missing baseline instead of hiding it.

## References

- [linux-test-project/lcov][lcov] - LCOV tracefile records (`SF`, `LF`, `LH`, `BRF`, `BRH`, `end_of_record`).
- [dawidd6/action-download-artifact][dl] - download an artifact from another workflow run.
- [marocchino/sticky-pull-request-comment][sticky] - create or update one PR comment keyed by `header`.
- Sibling skills: `lcov-analysis` (parsers and the pass/fail gate), `jacoco-analysis`, `coverage-py-analysis`, `js-unit-tests` (Jest/Vitest coverage output), `test-coverage-targeter` (which uncovered branches to target next).

[lcov]: https://github.com/linux-test-project/lcov
[dl]: https://github.com/dawidd6/action-download-artifact
[sticky]: https://github.com/marocchino/sticky-pull-request-comment
