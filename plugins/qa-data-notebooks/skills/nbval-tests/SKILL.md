---
name: nbval-tests
description: "Validate Jupyter notebooks via the `pytest --nbval` plugin - re-execute cells and compare outputs to stored results. Cover the strict path (output match required), `--nbval-lax` (failure-only), `--sanitize-with` for dynamic outputs, and per-cell controls (`#NBVAL_SKIP`, `#NBVAL_IGNORE_OUTPUT`, `#NBVAL_RAISES_EXCEPTION`). Use when a repo ships `.ipynb` files as tutorials, docs, or analyses that must keep producing the same outputs after a dependency upgrade or source change."
metadata:
  keywords: "nbval, jupyter, notebook-testing, pytest, regression-testing"
---

# nbval-tests

nbval is a pytest plugin that validates Jupyter notebooks by
re-executing cells and comparing outputs against stored results,
*"ensuring that the notebook is behaving as expected and that changes
to underlying source code haven't affected the results"* per the
[nbval docs].

## When to use

- A team ships analyses, tutorials, or docs as notebooks - protect
  them from silent rot when libraries upgrade.
- Notebooks that double as integration tests for a Python library
  (the README example actually executes).
- CI gate: every PR re-runs the notebook corpus.

## Step 1 - Install

```bash
pip install nbval pytest
```

Per the [nbval docs].

## Step 2 - Strict mode (default)

```bash
pytest --nbval my_notebook.ipynb
```

Re-executes every cell; fails if any output differs from stored.

## Step 3 - Lax mode (failure-only)

```bash
pytest --nbval-lax my_notebook.ipynb
```

*"Collects notebooks and runs them, failing if there is an error"* - 
skips output comparison unless cells bear the `#NBVAL_CHECK_OUTPUT`
marker per the [nbval docs]. Use as the default for tutorials where
output is incidental and execution is what matters.

## Step 4 - Per-cell controls

Add comments at cell start:

| Marker | Effect |
|---|---|
| `# NBVAL_SKIP` | Cell not executed during testing |
| `# NBVAL_IGNORE_OUTPUT` | Cell runs; output diff ignored |
| `# NBVAL_CHECK_OUTPUT` | Force output checking (lax mode) |
| `# NBVAL_RAISES_EXCEPTION` | Validate that the cell raises |

Cell tags (in notebook metadata, lowercase-with-dashes:
`nbval-skip`, `nbval-ignore-output`, etc.) are equivalent and
recommended for non-Python kernels.

## Step 5 - Sanitize dynamic outputs

For timestamps, UUIDs, memory addresses:

```bash
pytest --nbval my_notebook.ipynb --sanitize-with sanitize.cfg
```

`sanitize.cfg`:

```ini
[regex1]
regex: \d{1,2}/\d{1,2}/\d{2,4}
replace: DATE-STAMP

[regex2]
regex: 0x[0-9a-fA-F]+
replace: MEMORY-ADDR

[regex3]
regex: \d+\.\d+(?:e-?\d+)?
replace: NUMBER
```

Tune carefully - over-sanitizing makes nbval miss real regressions.

## Step 6 - Test discovery

```bash
# Whole notebooks/ directory
pytest --nbval notebooks/

# Filter by name
pytest --nbval notebooks/ -k "tutorial"

# Single notebook + verbose
pytest --nbval --verbose notebooks/intro.ipynb
```

## Step 7 - CI integration

```yaml
# GitHub Actions
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'

- name: Install
  run: |
    pip install -r requirements.txt
    pip install nbval pytest

- name: Run notebook tests (lax)
  run: pytest --nbval-lax notebooks/ --sanitize-with sanitize.cfg
```

For tutorial repos, lax mode + sanitize is usually right.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use strict mode for tutorial notebooks | Every random seed change fails CI | Use `--nbval-lax` (Step 3) |
| Skip cells liberally with `# NBVAL_SKIP` | Coverage shrinks; notebook becomes untested | Use `# NBVAL_IGNORE_OUTPUT` instead - still verifies execution |
| Sanitize all numeric output | Real regressions hidden | Targeted regexes (Step 5) |
| Run nbval against notebooks that mutate disk/state | Tests become flaky | Use ephemeral working dirs; `monkeypatch.chdir(tmp_path)` |
| No `requirements.txt` pinning | "Works on author's machine"; CI fails on minor lib bumps | Pin notebook deps separately from prod deps |

## Limitations

- Stored output ground truth lives in the `.ipynb` file - git diffs
  for output cells are noisy. Use `nbstripout` only when sanitize
  + lax mode aren't enough.
- Non-Python kernels (R, Julia) require kernel install on CI.
- Long-running cells slow CI; consider running notebook tests in
  a separate workflow with caching.

## References

- [nbval docs] - install, modes, per-cell markers, sanitize config

[nbval docs]: https://nbval.readthedocs.io/en/latest/
