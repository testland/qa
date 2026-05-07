---
name: doctest-tests
description: "Configures and runs Python''''s stdlib doctest — embeds executable test cases in docstrings using `>>>` Python interactive prompt convention; supports `# doctest: +ELLIPSIS` / `+NORMALIZE_WHITESPACE` / `+SKIP` directives; integrates with pytest via `--doctest-modules` flag; runs as `python -m doctest module.py -v`. Use for self-documenting reference implementations + simple smoke-test coverage embedded in API docs."
rating: 22
d6: 4
archetype: S1
---

# doctest-tests

## Overview

Per [docs.python.org/3/library/doctest.html][dt-docs]:

[dt-docs]: https://docs.python.org/3/library/doctest.html

doctest is Python's stdlib facility for embedding executable
examples in docstrings. The interactive-prompt convention
(`>>> ...` for input; expected output on the next line) becomes a
test case automatically.

Distinguishing properties:

- **Self-documenting**: examples in docstrings render in `help()`
  and Sphinx HTML.
- **Stdlib**: no install needed.
- **Limited scope**: best for simple smoke tests + API reference;
  not a replacement for pytest.

## When to use

- Library / utility code where API docs include usage examples.
- Smoke tests for documented behavior (verifying docs don't drift
  from implementation).
- Sphinx-rendered documentation where examples should be guaranteed
  to work.
- Simple modules where the doctest IS the test suite.

For non-trivial test suites, prefer [`pytest-tests`](../pytest-tests/SKILL.md).
Use doctest as a complement (smoke + docs), not replacement.

## Step 1 — Basic doctest

```python
def sum(a, b):
    """Add two numbers.

    >>> sum(1, 2)
    3
    >>> sum(0, 0)
    0
    >>> sum(-1, 1)
    0
    """
    return a + b
```

Run:

```bash
python -m doctest module.py
python -m doctest module.py -v   # verbose; show all examples
```

Pass if the doctest output matches; fail if mismatch.

## Step 2 — Multi-line + intermediate state

```python
def fibonacci(n):
    """Compute Fibonacci numbers iteratively.

    >>> fibonacci(0)
    0
    >>> fibonacci(1)
    1
    >>> fibonacci(10)
    55
    >>> [fibonacci(n) for n in range(8)]
    [0, 1, 1, 2, 3, 5, 8, 13]
    """
    if n < 2: return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b
```

## Step 3 — Directives

Per [dt-docs][dt-docs]:

| Directive | Use |
|---|---|
| `# doctest: +ELLIPSIS` | `...` matches arbitrary substrings |
| `# doctest: +NORMALIZE_WHITESPACE` | Collapse whitespace before compare |
| `# doctest: +SKIP` | Skip this example |
| `# doctest: +IGNORE_EXCEPTION_DETAIL` | Ignore exception message detail (just match exception type) |
| `# doctest: +DONT_ACCEPT_TRUE_FOR_1` | Strict bool != int comparison |
| `# doctest: -ELLIPSIS` | Disable a directive |

Examples:

```python
def list_users():
    """Return user records.

    >>> list_users()  # doctest: +ELLIPSIS
    [{'id': 1, 'name': 'Alice', 'created_at': ...}, ...]

    >>> list_users()  # doctest: +NORMALIZE_WHITESPACE
    [{'id': 1,  'name': 'Alice'}]
    """
    return [...]

def buggy_function():
    """Raise an error.

    >>> buggy_function()  # doctest: +IGNORE_EXCEPTION_DETAIL
    Traceback (most recent call last):
        ...
    ValueError
    """
    raise ValueError("specific message that may change")
```

## Step 4 — Expected exceptions

```python
def divide(a, b):
    """Divide a by b.

    >>> divide(10, 2)
    5.0
    >>> divide(10, 0)
    Traceback (most recent call last):
        ...
    ZeroDivisionError: division by zero
    """
    return a / b
```

The `Traceback...` + `...` ellipsis + exception line pattern is
specific to doctest expected-error format.

## Step 5 — pytest integration

```bash
pip install pytest
pytest --doctest-modules src/
```

Per pytest docs, `--doctest-modules` collects doctests from all
modules in the source tree. Combine with regular pytest:

```bash
pytest --doctest-modules tests/
```

Both regular tests + doctests run in one pass.

In `pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = "--doctest-modules"
```

## Step 6 — Sphinx integration

`sphinx.ext.doctest` runs doctests during Sphinx HTML build:

```python
# docs/conf.py
extensions = ['sphinx.ext.autodoc', 'sphinx.ext.doctest']

doctest_global_setup = """
import mymodule
"""
```

```bash
sphinx-build -b doctest docs/ build/doctest/
```

This catches docs that drift from the implementation — examples in
RST/MD docs are also doctest-runnable.

## Step 7 — When doctest is the WRONG choice

doctest is **not** for:

- Tests with shared expensive setup (no fixtures)
- Parametrized tests across many cases (verbose)
- Tests with non-deterministic output (timestamps, IDs, dicts in
  Python <3.7 with arbitrary ordering)
- Mocking external systems (no built-in mock)
- Coverage measurement (works with `coverage run -m doctest` but
  rougher than pytest-cov)

For those, use [`pytest-tests`](../pytest-tests/SKILL.md).

## Step 8 — CI integration

```yaml
- run: pip install pytest
- run: pytest --doctest-modules src/
# Or stdlib-only:
- run: python -m doctest src/*.py -v
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use doctest for complex logic | Docstrings become unreadable | Use pytest for non-trivial tests; doctest for examples |
| Show non-deterministic output (timestamps) without ELLIPSIS | Test fails on every run | Use `+ELLIPSIS` directive (Step 3) |
| Show dict output in older Python (pre-3.7) | Order varies; fails | Sort first or use Python 3.7+ insertion-order dict |
| Forget `Traceback (most recent call last):` pattern | Exception expectation doesn't match | Follow exact format (Step 4) |
| Skip Sphinx integration for documented examples | Docs drift from impl | `sphinx.ext.doctest` (Step 6) |

## Limitations

- Whitespace + output formatting is exact-match by default.
- No fixtures / setup beyond module-level state.
- Test discovery is name-based (functions / classes with docstrings
  containing `>>>`).
- Mocking requires breaking out of the docstring (defeats the
  purpose).

## References

- [dt-docs][dt-docs] — official doctest reference
- docs.pytest.org/en/stable/how-to/doctest.html — pytest --doctest-modules
- sphinx-doc.org/en/master/usage/extensions/doctest.html — Sphinx integration
- [`pytest-tests`](../pytest-tests/SKILL.md),
  [`unittest-tests`](../unittest-tests/SKILL.md),
  [`nose2-tests`](../nose2-tests/SKILL.md) — sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
  — test code hygiene
