# LCOV record format, baseline diff, and CI wiring

Deep reference for the lcov-analysis SKILL.md. Consult for the full `.info`
record-keyword table, the baseline-diff and gate reference implementation, and
the PR coverage-gate CI job.

[lcov]: https://github.com/linux-test-project/lcov

## `.info` record-keyword reference

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

## Diff vs baseline

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

## Gate

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

## CI shape

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

Cache `main`'s LCOV as an artifact so PRs diff against it rather than
recomputing the merge base's coverage twice.
