# doctest - executable docstring examples (reference)

Companion reference for `python-unit-tests`. Consult for
documentation-as-tests: library code where API docs include usage examples
that must not drift from the implementation. Not a replacement for pytest -
use it as a complement (smoke + docs).

Per [docs.python.org/3/library/doctest.html][dt-docs]:

[dt-docs]: https://docs.python.org/3/library/doctest.html

doctest embeds executable examples in docstrings: the interactive-prompt
convention (`>>> ...` input, expected output on the next line) becomes a
test case automatically. Examples render in `help()` and Sphinx HTML.

## Basic doctest

```python
def sum(a, b):
    """Add two numbers.

    >>> sum(1, 2)
    3
    >>> sum(-1, 1)
    0
    """
    return a + b
```

```bash
python -m doctest module.py       # silent on pass
python -m doctest module.py -v    # verbose; show all examples
```

## Directives

Per [dt-docs][dt-docs]:

| Directive | Use |
|---|---|
| `# doctest: +ELLIPSIS` | `...` matches arbitrary substrings |
| `# doctest: +NORMALIZE_WHITESPACE` | Collapse whitespace before compare |
| `# doctest: +SKIP` | Skip this example |
| `# doctest: +IGNORE_EXCEPTION_DETAIL` | Match exception type only |
| `# doctest: +DONT_ACCEPT_TRUE_FOR_1` | Strict bool != int comparison |

```python
>>> list_users()  # doctest: +ELLIPSIS
[{'id': 1, 'name': 'Alice', 'created_at': ...}, ...]
```

## Expected exceptions

```python
>>> divide(10, 0)
Traceback (most recent call last):
    ...
ZeroDivisionError: division by zero
```

The `Traceback (most recent call last):` + `...` + exception line pattern
is doctest's expected-error format - it must match exactly.

## pytest and Sphinx integration

```bash
pytest --doctest-modules src/     # collects doctests from all modules
```

or in `pyproject.toml`: `addopts = "--doctest-modules"`
(docs.pytest.org/en/stable/how-to/doctest.html).

`sphinx.ext.doctest` runs doctests during the Sphinx build
(sphinx-doc.org/en/master/usage/extensions/doctest.html):

```bash
sphinx-build -b doctest docs/ build/doctest/
```

## When doctest is the WRONG choice

- Tests with shared expensive setup (no fixtures).
- Parametrized tests across many cases (verbose).
- Non-deterministic output (timestamps, IDs) - needs `+ELLIPSIS` at best.
- Mocking external systems (no built-in mock).

For those, use pytest (SKILL.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| doctest for complex logic | Docstrings become unreadable | pytest for non-trivial tests |
| Non-deterministic output without ELLIPSIS | Fails on every run | `+ELLIPSIS` directive |
| Wrong `Traceback` pattern | Exception expectation doesn't match | Follow the exact format above |

## References

- [dt-docs][dt-docs] - official doctest reference
- docs.pytest.org/en/stable/how-to/doctest.html - pytest --doctest-modules
- sphinx-doc.org/en/master/usage/extensions/doctest.html - Sphinx integration
