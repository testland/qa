---
name: lcov-analysis
description: Parses LCOV `.info` text files (the de-facto coverage interchange format produced by gcov, llvm-cov, Coverage.py via `py2lcov`, JaCoCo via `xml2lcov`, Devel::Cover, Jest via `lcov` reporter, NYC, and most others). Extracts per-file line / function / branch metrics from the canonical record keywords (TN/SF/FN/FNDA/FNF/FNH/BRDA/BRF/BRH/DA/LH/LF), computes the diff vs a baseline, and emits per-file gating verdicts. Use for PR coverage gates that don't depend on a specific language runtime.
rating: 24
d6: 4
archetype: S1
---

# lcov-analysis

## Overview

LCOV is "a tool suite for manipulating and displaying code coverage
information" with three command-line utilities: **`geninfo`**
(creates LCOV data files from raw coverage data), **`lcov`**
(captures, filters, manipulates, processes in parallel), and
**`genhtml`** (HTML report generation) ([lcov-readme][lcov]).

[lcov]: https://github.com/linux-test-project/lcov

The toolchain is "language-agnostic (via converter scripts:
llvm2lcov, py2lcov, perl2lcov, xml2lcov)" ([lcov-readme][lcov]) —
LCOV `.info` is the **lingua franca** every coverage UI (Coveralls,
Codecov, Codacy, SonarQube, in-house dashboards) ingests.

This skill covers parsing the `.info` text format directly so the
team can gate PRs without running the full HTML generation step.

## When to use

- The CI already emits LCOV (or can via a converter) and the team
  wants PR-time per-file coverage gating.
- A coverage SaaS isn't an option (compliance, cost, air-gapped CI).
- A multi-language project needs one analyzer (Python via `py2lcov`,
  Java via `xml2lcov`, Node via `nyc`/`jest`'s `lcov` reporter, C++
  via `gcov` → `lcov`).
- A custom coverage UI / Slack bot needs structured input.

## Step 1 — `.info` format reference

Per [lcov-readme][lcov], the LCOV coverage data format uses these
record types:

| Keyword         | Meaning                                                 |
|-----------------|---------------------------------------------------------|
| `TN:<test>`     | Test name (often empty for whole-suite captures).        |
| `SF:<path>`     | Source file path (one record set per source file).      |
| `FN:<line>,<name>` | Function declared at `<line>` named `<name>`.          |
| `FNDA:<count>,<name>` | Function `<name>` was called `<count>` times.       |
| `FNF:<n>`       | Functions found in this file.                            |
| `FNH:<n>`       | Functions hit at least once.                             |
| `BRDA:<line>,<block>,<branch>,<taken>` | Branch coverage data.             |
| `BRF:<n>`       | Branches found.                                          |
| `BRH:<n>`       | Branches hit.                                            |
| `DA:<line>,<count>` | Line `<line>` was executed `<count>` times.          |
| `LH:<n>`        | Lines hit.                                                |
| `LF:<n>`        | Lines found.                                              |
| `end_of_record` | Marks completion of the current source file's data.     |

Per record, `BRDA`'s fourth value `<taken>` is the hit count for
that branch arm or `-` if the branch was never reached (the
preceding line wasn't executed).

## Step 2 — Sample `.info` block

```
TN:
SF:src/checkout/cart.ts
FN:10,addItem
FN:32,removeItem
FNDA:42,addItem
FNDA:0,removeItem
FNF:2
FNH:1
DA:11,42
DA:12,42
DA:13,0
DA:33,0
DA:34,0
LF:5
LH:2
BRDA:13,0,0,42
BRDA:13,0,1,0
BRF:2
BRH:1
end_of_record
```

Reading: `cart.ts` has 2 functions, 1 hit (50% function coverage); 5
lines, 2 hit (40% line); 2 branches, 1 hit (50% branch).
`removeItem` was never called.

## Step 3 — Parse

```python
# scripts/parse_lcov.py
from collections import defaultdict

def parse_lcov(path):
    files = []
    cur = None
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('SF:'):
                cur = {
                    'path': line[3:],
                    'functions': [],
                    'lines': {},
                    'branches': defaultdict(list),
                    'fnf': 0, 'fnh': 0,
                    'lf': 0, 'lh': 0,
                    'brf': 0, 'brh': 0,
                }
            elif line.startswith('FN:'):
                lineno, name = line[3:].split(',', 1)
                cur['functions'].append({'line': int(lineno), 'name': name, 'hits': 0})
            elif line.startswith('FNDA:'):
                hits, name = line[5:].split(',', 1)
                for fn in cur['functions']:
                    if fn['name'] == name:
                        fn['hits'] = int(hits)
                        break
            elif line.startswith('DA:'):
                lineno, hits = line[3:].split(',', 1)
                cur['lines'][int(lineno)] = int(hits.split(',')[0])  # checksum optional
            elif line.startswith('BRDA:'):
                lineno, block, branch, taken = line[5:].split(',', 3)
                cur['branches'][int(lineno)].append({
                    'block': int(block),
                    'branch': int(branch),
                    'taken': 0 if taken == '-' else int(taken),
                })
            elif line.startswith(('FNF:', 'FNH:', 'LF:', 'LH:', 'BRF:', 'BRH:')):
                key, val = line.split(':', 1)
                cur[key.lower()] = int(val)
            elif line == 'end_of_record':
                files.append(cur)
                cur = None
    return files
```

**Don't trust the FNF/FNH/LF/LH/BRF/BRH summary fields blindly** —
some buggy emitters produce summaries that don't match the per-line
data. For correctness, recompute from `lines`, `functions`,
`branches`.

## Step 4 — Diff vs baseline

```python
def coverage_diff(current, baseline):
    """For each file, compute (line%_now - line%_then), (branch%_now - branch%_then)."""
    base_by_path = {f['path']: f for f in baseline}
    out = []
    for f in current:
        b = base_by_path.get(f['path'])
        line_now = pct(f['lh'], f['lf'])
        line_then = pct(b['lh'], b['lf']) if b else None
        branch_now = pct(f['brh'], f['brf'])
        branch_then = pct(b['brh'], b['brf']) if b else None
        out.append({
            'path': f['path'],
            'line_now': line_now, 'line_then': line_then,
            'branch_now': branch_now, 'branch_then': branch_then,
            'is_new': b is None,
        })
    return out

def pct(num, denom):
    return None if denom == 0 else round(100 * num / denom, 1)
```

The interesting outputs are **drops** (line_now < line_then) and
**new files with sub-threshold coverage** (is_new and line_now < gate).

## Step 5 — Gate

A defensible gate has three rules:

1. **Whole-repo line coverage MAY drop by at most N pp** (typically
   N = 0.5 — guards against runaway erosion without blocking
   refactors).
2. **No file MAY drop more than M pp** (typically M = 5 — calls out
   the specific file that lost coverage).
3. **New files MUST hit threshold** (typically 80% line, 70%
   branch).

```python
def gate(diff, whole_drop_max=0.5, file_drop_max=5.0, new_file_min=80.0):
    failures = []
    for f in diff:
        if f['is_new'] and f['line_now'] is not None and f['line_now'] < new_file_min:
            failures.append((f['path'], 'new file below threshold', f['line_now']))
        elif f['line_then'] is not None and f['line_now'] is not None:
            drop = f['line_then'] - f['line_now']
            if drop > file_drop_max:
                failures.append((f['path'], f'line% dropped {drop:.1f}pp', drop))
    # Whole-repo drop:
    sum_then_lh = sum(f['line_then'] for f in diff if f['line_then'] is not None)
    sum_now_lh  = sum(f['line_now']  for f in diff if f['line_now']  is not None)
    return failures
```

Per-file gates beat whole-repo gates: an aggregate drop hides which
file caused it. Per-file output gives the reviewer a direct
target.

## Step 6 — CI shape

```yaml
- name: Run tests with LCOV reporter
  run: npm test -- --coverage --coverageReporters=lcov

- name: Download baseline
  uses: actions/download-artifact@v4
  with:
    name: lcov-main
    path: baseline/

- name: Parse + diff + gate
  run: |
    python scripts/parse_lcov.py coverage/lcov.info > current.json
    python scripts/parse_lcov.py baseline/lcov.info > baseline.json
    python scripts/coverage_gate.py current.json baseline.json

- name: Upload current LCOV (becomes next PR's baseline when on main)
  if: github.ref == 'refs/heads/main'
  uses: actions/upload-artifact@v4
  with:
    name: lcov-main
    path: coverage/lcov.info
    retention-days: 90
```

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                                      | Fix |
|---------------------------------------------------------------|------------------------------------------------------------------------------------|-----|
| Whole-repo gate only                                           | Aggregate drops hide which file caused them; review focus is unclear.             | Per-file gates; per-file PR comments. |
| `BRH < BRF` ignored                                            | A single uncovered branch on a critical path silently slips through.              | Track branch% separately from line%; gate threshold differs. |
| Trusting `FNF/FNH/LF/LH` summary fields without recomputing    | Some emitters produce wrong summaries; gate verdict drifts from the data.         | Recompute from per-line records (Step 3 note). |
| Gate against the PR's own merge base (running coverage twice)  | Slow; flaky if coverage itself is non-deterministic.                              | Cache `main`'s LCOV as an artifact; PRs diff against it (Step 6). |
| Treating new test files as "new code, gate at 80%"             | The new test file is the test, not the SUT.                                       | Filter the file list to source paths only (e.g. `src/**`, not `tests/**`). |
| Strict mode that fails on any drop                             | Refactors that legitimately remove dead code drop coverage; team disables gate.  | Allow whole-repo drop ≤0.5pp; allow per-file drop ≤5pp; only new files have a hard min. |
| One unified threshold for line + branch                        | Branch coverage is harder; identical thresholds always fail one or the other.    | Separate thresholds (e.g. line 80, branch 70). |

## Limitations

- **`.info` is text, not standardized via a formal spec.** The
  authoritative source is the [lcov-readme][lcov] + the codebase
  itself; format extensions vary by emitter. Tolerant parsing is
  required.
- **No file-level "this is a test file" marker.** Filter by path
  convention.
- **No PR-context awareness.** The format doesn't know about
  `git diff` — pair with `git diff --name-only` to scope coverage
  changes to PR-touched files when needed.
- **Branch coverage shape varies.** Some emitters report
  per-condition (multi-arm `BRDA`); some report per-decision
  (single arm). Normalize before cross-tool comparisons.

## References

- [lcov-readme][lcov] — LCOV toolchain (geninfo / lcov / genhtml),
  `.info` format keywords, language-agnostic converters.
- [`cobertura-analysis`](../cobertura-analysis/SKILL.md) — sibling
  for the Cobertura XML format (same PR-gating shape, different
  parser).
- [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) —
  build-an-X workflow that consumes parsed coverage and emits a PR
  comment with file-level deltas.
- [`unit-test-coverage-targeter`](../unit-test-coverage-targeter/SKILL.md)
  — picks which uncovered branches to target first using the parsed
  output.
