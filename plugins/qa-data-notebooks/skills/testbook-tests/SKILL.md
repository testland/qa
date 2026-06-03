---
name: testbook-tests
description: "Use the `@testbook` decorator to write conventional pytest unit tests against functions defined in Jupyter notebooks, without copy-pasting the function into a `.py` file. Pairs with `tb.ref()` (notebook object access) and `tb.inject()` (insert code into kernel) for hermetic per-test setup."
type: skill
rating: 22
d6: 4
keywords:
  - testbook
  - jupyter
  - notebook-testing
  - pytest
  - unit-testing
---

# testbook-tests

testbook is a *"unit testing framework for testing code in Jupyter
Notebooks"* per the [testbook docs]. It treats `.ipynb` files like
`.py` files for testing - the test runs separately from the notebook
itself.

## When to use

- A library-style notebook defines reusable functions; you want unit
  tests without extracting them to a `.py` module.
- Mixing notebook + pytest in the same test suite where some tests
  use `nbval` (full-notebook regression) and others use `testbook`
  (function-level).
- Teaching example where students implement functions in a notebook
  and grading happens via assertions on those functions.

## Step 1 - Install

```bash
pip install testbook pytest
```

Per the [testbook docs].

## Step 2 - Basic decorator pattern

Given a notebook cell:

```python
def func(a, b):
    return a + b
```

Test:

```python
from testbook import testbook

@testbook('/path/to/notebook.ipynb', execute=True)
def test_func(tb):
    func = tb.ref("func")
    assert func(1, 2) == 3
```

Per the [testbook docs]: the decorator accepts the notebook path +
`execute` parameter controlling cell execution.

## Step 3 - `tb.ref()` for notebook objects

```python
@testbook('analysis.ipynb', execute=True)
def test_clean_data_drops_nulls(tb):
    clean_data = tb.ref("clean_data")
    df = tb.ref("pd").DataFrame({"a": [1, None, 3]})
    result = clean_data(df)
    assert len(result) == 2
```

`tb.ref()` returns a proxy to the notebook-side object - calls run
in the kernel.

## Step 4 - `tb.inject()` for setup code

```python
@testbook('model.ipynb', execute=True)
def test_predict_with_specific_input(tb):
    tb.inject(
        """
        import numpy as np
        np.random.seed(42)
        test_input = np.array([[1.0, 2.0, 3.0]])
        """
    )
    predict = tb.ref("predict")
    result = predict(tb.ref("test_input"))
    assert result.shape == (1,)
```

`tb.inject()` runs arbitrary code in the kernel - useful for
deterministic seeding, mocking globals, fixture setup.

## Step 5 - Selective cell execution

```python
# Execute only specific cells (by tag)
@testbook('notebook.ipynb', execute=['imports', 'data-load'])
def test_with_partial_execution(tb):
    df = tb.ref("df")
    assert len(df) > 0
```

Avoids slow training cells when testing pure-function helpers.

## Step 6 - Pytest fixture (shared kernel)

```python
import pytest
from testbook import testbook

@pytest.fixture(scope="module")
def tb():
    with testbook('/path/to/notebook.ipynb', execute=True) as tb:
        yield tb

def test_func_a(tb):
    assert tb.ref("func_a")(1) == 2

def test_func_b(tb):
    assert tb.ref("func_b")("x") == "X"
```

Per the [testbook docs]: shared kernel context across tests via
pytest fixtures - much faster than re-executing the notebook per
test.

## Step 7 - Object patching

```python
@testbook('api_client.ipynb', execute=True)
def test_handle_api_failure(tb):
    with tb.patch('requests.get') as mock_get:
        mock_get.return_value.status_code = 500
        result = tb.ref("fetch_data")()
        assert result == {"error": "API failed"}
```

`tb.patch()` mirrors `unittest.mock.patch` but operates inside the
notebook's kernel.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Re-execute notebook per test | Slow; minutes per CI run | Use module-scoped fixture (Step 6) |
| Use `tb.ref()` to fetch large DataFrames into test process | Serialization overhead; "non-serializable value" errors | Operate on the proxy via `tb.ref()` calls; only fetch primitives |
| Skip `execute=True` and assume cells already ran | Notebook variables may not exist | Always `execute=True` (or scoped fixture) |
| Mix testbook + nbval on same notebook | Conflicting kernel sessions | Use one tool per notebook (or separate workflow runs) |
| Inject arbitrary state via `tb.inject` for prod code | Tests pass but real notebook fails | Inject only test-specific setup (seeds, fixtures) |

## Limitations

- testbook executes notebook cells via the standard Jupyter kernel - 
  notebooks with browser-only widgets (ipywidgets without backend)
  may behave differently in tests.
- Long-running cells in `execute=True` slow tests; use selective
  execution (Step 5) when possible.
- Non-serializable objects (custom Python classes, file handles)
  cannot pass through `tb.ref()` cleanly; refactor to return
  primitives.

## References

- [testbook docs] - `@testbook` decorator, `tb.ref()`, `tb.inject()`,
  `tb.patch()`, pytest fixture pattern

[testbook docs]: https://testbook.readthedocs.io/
