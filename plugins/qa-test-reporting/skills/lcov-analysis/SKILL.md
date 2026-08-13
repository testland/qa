---
name: lcov-analysis
description: "Parses both mainstream coverage interchange formats: LCOV `.info` text files (produced by gcov, llvm-cov, Coverage.py via `py2lcov`, JaCoCo via `xml2lcov`, Devel::Cover, Jest via `lcov` reporter, NYC, and most others) and Cobertura XML (coverage-04.dtd - emitted by JaCoCo, coverage.py `--xml`, Jest's `cobertura` reporter, coverlet, gocover-cobertura; full parser in references/cobertura.md). Extracts per-file line / function / branch metrics from the canonical record keywords (TN/SF/FN/FNDA/FNF/FNH/BRDA/BRF/BRH/DA/LH/LF), computes the diff vs a baseline, and emits per-file gating verdicts. Use for PR coverage gates that don't depend on a specific language runtime, whichever of the two formats the CI emits."
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
llvm2lcov, py2lcov, perl2lcov, xml2lcov)" ([lcov-readme][lcov]) - 
LCOV `.info` is the **lingua franca** every coverage UI (Coveralls,
Codecov, Codacy, SonarQube, in-house dashboards) ingests.

This skill covers parsing the `.info` text format directly so the
team can gate PRs without running the full HTML generation step. The
sibling Cobertura XML format (same PR-gating shape, different parser)
is covered in [references/cobertura.md](references/cobertura.md) -
pick whichever format the existing reporter produces.

## When to use

- The CI already emits LCOV or Cobertura XML (or can via a
  converter) and the team wants PR-time per-file coverage gating.
- A coverage SaaS isn't an option (compliance, cost, air-gapped CI).
- A multi-language project needs one analyzer (Python via `py2lcov`,
  Java via `xml2lcov`, Node via `nyc`/`jest`'s `lcov` reporter, C++
  via `gcov` → `lcov`).
- A custom coverage UI / Slack bot needs structured input.

## How to use

1. Confirm CI emits LCOV `.info` (natively or via a converter:
   `py2lcov`, `xml2lcov`, `nyc` / Jest's `lcov` reporter,
   `gcov` → `lcov`).
2. Parse the `.info` into per-file line / function / branch metrics
   (Parse below); recompute totals from the per-line records rather
   than trusting the summary fields.
3. Cache `main`'s `.info` as the baseline; diff each PR's coverage
   against it.
4. Gate per file on the three rules below (whole-repo drop, per-file
   drop, new-file minimum) - the diff + gate reference implementation,
   the full record-format table, and the CI wiring are in
   [references/format-diff-and-ci.md](references/format-diff-and-ci.md).

## Worked example

A single source file's `.info` record, and how to read it:

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
`removeItem` was never called (`FNDA:0`). `SF` opens the record,
`DA:<line>,<count>` gives per-line hits, `LH`/`LF` and `BRH`/`BRF`
are the roll-ups, and `end_of_record` closes the file. The full
record-keyword table is in
[references/format-diff-and-ci.md](references/format-diff-and-ci.md).

## Parse

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

**Don't trust the FNF/FNH/LF/LH/BRF/BRH summary fields blindly** - 
some buggy emitters produce summaries that don't match the per-line
data. For correctness, recompute from `lines`, `functions`,
`branches`.

## Gate rules

A defensible per-file gate has three rules:

1. **Whole-repo line coverage MAY drop by at most N pp** (typically
   N = 0.5 - guards against runaway erosion without blocking
   refactors).
2. **No file MAY drop more than M pp** (typically M = 5 - calls out
   the specific file that lost coverage).
3. **New files MUST hit threshold** (typically 80% line, 70%
   branch).

Per-file gates beat whole-repo gates: an aggregate drop hides which
file caused it; per-file output gives the reviewer a direct target.
The `coverage_diff` + `gate` reference implementation and the PR
coverage-gate CI job are in
[references/format-diff-and-ci.md](references/format-diff-and-ci.md).

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                                      | Fix |
|---------------------------------------------------------------|------------------------------------------------------------------------------------|-----|
| Whole-repo gate only                                           | Aggregate drops hide which file caused them; review focus is unclear.             | Per-file gates; per-file PR comments. |
| `BRH < BRF` ignored                                            | A single uncovered branch on a critical path silently slips through.              | Track branch% separately from line%; gate threshold differs. |
| Trusting `FNF/FNH/LF/LH` summary fields without recomputing    | Some emitters produce wrong summaries; gate verdict drifts from the data.         | Recompute from per-line records (see the Parse note). |
| Gate against the PR's own merge base (running coverage twice)  | Slow; flaky if coverage itself is non-deterministic.                              | Cache `main`'s LCOV as an artifact; PRs diff against it (see the CI wiring in references). |
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
  `git diff` - pair with `git diff --name-only` to scope coverage
  changes to PR-touched files when needed.
- **Branch coverage shape varies.** Some emitters report
  per-condition (multi-arm `BRDA`); some report per-decision
  (single arm). Normalize before cross-tool comparisons.

## References

- [lcov-readme][lcov] - LCOV toolchain (geninfo / lcov / genhtml),
  `.info` format keywords, language-agnostic converters.
- [references/format-diff-and-ci.md](references/format-diff-and-ci.md) -
  full `.info` record-keyword table, the baseline-diff + gate
  reference implementation, and the PR coverage-gate CI job.
- [references/cobertura.md](references/cobertura.md) - the sibling
  Cobertura XML format (same PR-gating shape, different parser).
- `coverage-diff-reporter` - 
  build-an-X workflow that consumes parsed coverage and emits a PR
  comment with file-level deltas.
- `test-coverage-targeter` - picks which uncovered branches to target first using the parsed
  output.
