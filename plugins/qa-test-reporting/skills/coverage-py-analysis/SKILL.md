---
name: coverage-py-analysis
description: "Configures coverage.py for Python projects - wires `coverage run` (replacing `python` for instrumentation), enables branch coverage via the `--branch` flag or `branch = True` config, manages the `.coverage` data file (single-process and `combine` for parallel pytest-xdist runs), authors `.coveragerc` with `source` / `omit` / `fail_under`, and emits the format the downstream tool needs (`coverage report` for terminal, `coverage xml` for Cobertura, `coverage html` for human review, `coverage lcov` for SaaS, `coverage json` for programmatic post-processing). Use for any Python test stack (pytest, unittest, nose) that needs PR-time coverage signal."
---

# coverage-py-analysis

## Overview

Per [coveragepy-docs][cov]:

[cov]: https://coverage.readthedocs.io/en/latest/

> "Coverage.py is a tool for measuring code coverage of Python
> programs. It monitors your program, noting which parts of the
> code have been executed, then analyzes the source to identify
> code that could have been executed but was not."

The tool is the de facto Python coverage solution; pytest's
`pytest-cov` plugin is a thin convenience wrapper around it. As of
the source fetch on 2026-05-05, "Current version is 7.13.5 (March
2026), supporting Python 3.10-3.15 alpha and PyPy3"
([coveragepy-docs][cov]).

## When to use

- The project tests with pytest, unittest, or nose, and the team
  needs PR-time coverage signal.
- A SaaS coverage dashboard (Codecov, Coveralls, Codacy) consumes
  LCOV or Cobertura - both are first-party output formats.
- A multi-language project (Python + JS + Java) needs per-language
  coverage in a unified format (LCOV).

## Step 1 - Install + replace `python` with `coverage run`

```bash
pip install coverage[toml]
```

`[toml]` is needed only for older Python (<3.11); newer ones include
TOML parsing in stdlib.

Per [coveragepy-docs][cov]:

> "Replace your normal python command with this tool (e.g.,
> `python something.py` becomes `coverage run something.py`)."

In practice, run pytest under coverage:

```bash
coverage run -m pytest
coverage report
```

Or via `pytest-cov`:

```bash
pytest --cov=src --cov-branch --cov-report=term-missing --cov-report=xml --cov-report=lcov
```

## Step 2 - Enable branch coverage

Per [coveragepy-docs][cov], coverage.py defaults to **statement
coverage** (line coverage). Branch coverage requires opt-in:

```bash
coverage run --branch -m pytest
```

Or in `.coveragerc`:

```ini
[run]
branch = True
```

Branch coverage catches the case where every line is executed but
not every condition arm - `if x and y` where only the true branch
is tested.

## Step 3 - Author `.coveragerc`

The canonical config (`.coveragerc` or `[tool.coverage]` in
`pyproject.toml`):

```ini
[run]
source = src
branch = True
parallel = True
omit =
    */tests/*
    */migrations/*
    */conftest.py

[report]
fail_under = 80
show_missing = True
skip_covered = False
exclude_lines =
    pragma: no cover
    raise NotImplementedError
    if __name__ == .__main__.:

[xml]
output = coverage.xml

[html]
directory = htmlcov

[lcov]
output = coverage.lcov

[json]
output = coverage.json
```

Per [coveragepy-docs][cov], the four key `[run]` settings:

| Setting    | Use                                                              |
|------------|------------------------------------------------------------------|
| `source`   | Restricts coverage to specific paths (avoids inflating from third-party). |
| `branch`   | Enables branch coverage (Step 2).                                 |
| `omit`     | Excludes files (tests, migrations, generated code).               |
| `fail_under` | Fails `coverage report` if the total drops below the threshold. |

`exclude_lines` patterns let the team mark unreachable / not-meant-to-be-tested
code with magic comments (`# pragma: no cover`) and sentinel patterns
like `raise NotImplementedError`.

## Step 4 - Combine parallel runs

Pytest-xdist runs tests across multiple processes; each process
writes its own `.coverage.<host>.<pid>.<rand>` file. Per
[coveragepy-docs][cov], `coverage combine` merges them:

```bash
coverage run --parallel -m pytest -n auto
coverage combine
coverage report
coverage xml
coverage lcov
```

`--parallel` (or `parallel = True` in `.coveragerc`) makes coverage
write per-process files instead of overwriting `.coverage`.
`coverage combine` then merges them into the final `.coverage`.

**Without combine, only the last process's data survives** - the
most common new-user mistake.

## Step 5 - Pick the output format

Per [coveragepy-docs][cov], coverage.py emits five formats:

| Command            | Output                                | Use                                          |
|--------------------|---------------------------------------|----------------------------------------------|
| `coverage report`  | Terminal text                         | CI log readability + dev loop.                |
| `coverage html`    | `htmlcov/index.html`                   | Human review with per-line drill-down.        |
| `coverage xml`     | `coverage.xml` (Cobertura format)      | Jenkins, Azure DevOps; cross-tool aggregation. |
| `coverage lcov`    | `coverage.lcov`                        | Codecov, Coveralls, cross-tool diffing.       |
| `coverage json`    | `coverage.json`                        | Programmatic post-processing.                 |

A typical CI emits `xml` + `lcov` + `report`:

```bash
coverage xml      # for Jenkins
coverage lcov     # for Codecov
coverage report   # for the CI log
```

## Step 6 - `coverage report --fail-under`

For a self-contained gate (without external scripting):

```bash
coverage report --fail-under=80
```

Or per the `.coveragerc` `[report] fail_under = 80` setting. Exit
code is non-zero if total coverage is below; CI fails.

For per-file gates (the same pattern as Jest's `coverageThreshold`,
see `js-unit-tests` in qa-unit-tests-js), parse the JSON output:

```python
# scripts/per_file_gate.py
import json, sys

CRITICAL_PATHS = {
    'src/api/payments.py':       {'lines': 100, 'branches': 100},
    'src/api/auth.py':           {'lines': 95,  'branches': 90},
}

data = json.load(open('coverage.json'))
failures = []

for path, requirements in CRITICAL_PATHS.items():
    f = data.get('files', {}).get(path)
    if not f:
        failures.append(f"{path}: file not found in coverage report")
        continue
    line_pct   = f['summary']['percent_covered']
    branch_pct = f['summary'].get('percent_covered_branches', 100)
    if line_pct < requirements['lines']:
        failures.append(f"{path}: line% {line_pct:.1f} < {requirements['lines']}")
    if branch_pct < requirements['branches']:
        failures.append(f"{path}: branch% {branch_pct:.1f} < {requirements['branches']}")

if failures:
    print('\n'.join(failures))
    sys.exit(1)
```

Per-file gates beat global gates for the same reason as in Jest:
critical paths get a strict floor; the rest gets a refactor-friendly
global.

## Step 7 - `# pragma: no cover` discipline

`exclude_lines` lets the team annotate unreachable code:

```python
def divide(a, b):
    if b == 0:                  # pragma: no cover
        raise ZeroDivisionError("intentional unreachable")
    return a / b
```

Use sparingly. Each `pragma: no cover` is a confession that the
code is excluded from coverage - make sure the exclusion is
intentional and reviewable.

The default `exclude_lines` patterns (Step 3) auto-exclude
`raise NotImplementedError` and `if __name__ == "__main__":` blocks
that are typically untested boilerplate.

## Step 8 - CI shape

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.13'

- run: pip install -e '.[dev]'

- name: Run tests with coverage (parallel)
  run: |
    coverage run --parallel -m pytest -n auto
    coverage combine

- name: Emit reports
  run: |
    coverage xml
    coverage lcov
    coverage json
    coverage report --fail-under=80

- name: Per-file gate
  run: python scripts/per_file_gate.py

- name: Upload to dashboard
  uses: codecov/codecov-action@v5
  with:
    files: coverage.lcov

- name: Save baseline (main only)
  if: github.ref == 'refs/heads/main'
  uses: actions/upload-artifact@v4
  with:
    name: coverage-baseline
    path: coverage.lcov
```

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                              | Fix |
|-------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Forgetting `coverage combine` after parallel runs                        | Only one process's data survives; coverage drops mysteriously.            | Always `combine` after `--parallel` (Step 4). |
| Not setting `source = src`                                              | Coverage measures every Python file imported, including stdlib + deps; numbers meaningless. | Set `source` to the project's own code (Step 3). |
| Statement coverage only (no `--branch`)                                  | Misses missing branch arms; correctness regressions invisible.            | Enable branch coverage globally (Step 2). |
| `# pragma: no cover` as escape hatch for "I'm too lazy to test this"     | Coverage number stays high; risk hidden.                                  | Reserve pragmas for truly unreachable / untestable; review each addition. |
| Running coverage in production / staging                                  | Instrumentation overhead; coverage's tracer slows the program.            | Coverage is for tests only. |
| Forgetting to omit `tests/` from `source`                                | Tests count as covered code; aggregate inflated.                          | Add `tests/` to `omit` (Step 3) or restrict `source` to `src/`. |
| `pytest-cov` without `--cov-branch`                                      | Same as above - statement-only coverage.                                  | Always pass `--cov-branch`. |
| Per-process `--cov-report=html` in xdist runs                            | Each worker writes a partial HTML; the report is incomplete.              | Generate reports after combine, not during pytest-cov. |

## Limitations

- **No native PR-context awareness.** Pair with
  `coverage-diff-reporter` for
  the diff vs main.
- **`# pragma: no cover` is repo-local.** No way to enforce that
  pragmas are reviewed in PRs from the coverage tool itself; pair
  with a custom lint (e.g. `flake8-coverage-pragma`).
- **C extensions aren't measured.** Pure-Python only; for C
  extensions use `gcov` or LLVM's instrumentation.
- **Async coverage is fine.** `asyncio` code is fully measured;
  the historical async-issues warnings have been resolved in 7.x.
- **Source must be readable.** Coverage emits "no source for code"
  warnings when running against installed packages with no source
  files. Run from the development checkout, not from `site-packages`.

## References

- [coveragepy-docs][cov] - overview, `coverage run` / `report` /
  `combine` workflow, branch coverage, `.coveragerc` config
  (`source`, `omit`, `branch`, `fail_under`), output formats
  (text, HTML, XML, LCOV, JSON), supported Python versions.
- `lcov-analysis` - coverage.py
  `coverage lcov` produces the LCOV file this parser consumes.
- `lcov-analysis` (references/cobertura.md) - coverage.py
  `coverage xml` produces the Cobertura file this parser consumes.
- `coverage-diff-reporter` - 
  PR-comment formatter built on top of the parsed coverage.py
  output.
- `test-coverage-targeter` - picks which uncovered branches to target next, given the
  coverage.py output.
