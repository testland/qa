---
name: pytest-tests
description: "Configures and runs pytest - the de facto Python test framework with fixture-based dependency injection (`@pytest.fixture` with scopes module/session/function), parametrize for table-driven tests (`@pytest.mark.parametrize`), markers (`@pytest.mark.skip` / `xfail` / `slow`), `conftest.py` for shared fixtures, plugin ecosystem (pytest-cov, pytest-asyncio, pytest-mock, pytest-xdist), `--lf`/`--ff` for fail-loop, coverage gating. Use when working with Python and needing the modern test framework."
rating: 24
d6: 4
---

# pytest-tests

## Overview

Per [docs.pytest.org/en/stable][pt-docs]:

[pt-docs]: https://docs.pytest.org/en/stable/

pytest is the de facto Python testing framework. Distinguishes from
`unittest` (stdlib) by: function-style tests (no `TestCase` class),
fixture-based dependency injection, rich plugin ecosystem,
parametrize for data-driven tests, intuitive assertions via plain
`assert` (rewritten to provide diff-rich failure output).

Per-framework lifecycle scope: configure / run / fixtures / mocking
/ coverage / CI. Test code hygiene (assertion quality, AAA structure,
mocking anti-patterns) is in [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md).

## When to use

- Modern Python project; pytest is the default for new code.
- Migrating from unittest (mostly mechanical via interop).
- Need fixture-based dependency injection + parametrize.

## Step 1 - Install

```bash
pip install pytest
# Common plugins:
pip install pytest-cov pytest-asyncio pytest-mock pytest-xdist
```

## Step 2 - First test

Per [pt-docs][pt-docs] convention:

```python
# test_sum.py
def sum(a, b):
    return a + b

def test_adds_1_and_2():
    assert sum(1, 2) == 3
```

```bash
pytest
```

pytest auto-discovers via `test_*.py` / `*_test.py` filenames and
`test_*` / `Test*` function/class names.

## Step 3 - Configuration

`pytest.ini` (or `pyproject.toml` `[tool.pytest.ini_options]` /
`setup.cfg` `[tool:pytest]`):

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-ra --strict-markers --strict-config"
markers = [
    "slow: marks tests as slow (deselect with -m 'not slow')",
    "integration: marks tests requiring DB/external resources",
]
```

`--strict-markers` rejects undeclared marker names - catches typos
like `@pytest.mark.skipp` (silently skipped before).

## Step 4 - Fixtures

```python
import pytest

@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()

@pytest.fixture(scope="session")
def app_config():
    return load_config()

@pytest.fixture(autouse=True)
def reset_state():
    yield
    cleanup_after_test()

def test_user_creation(db_connection, app_config):
    user = create_user(db_connection, app_config)
    assert user.id is not None
```

Fixture scopes: `function` (default), `class`, `module`, `package`,
`session`. Choose narrowest scope that doesn't waste setup time.

`conftest.py` shares fixtures across multiple test files in the
same directory (and subdirectories).

## Step 5 - Parametrize

```python
@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (100, 200, 300),
])
def test_sum_parametrized(a, b, expected):
    assert sum(a, b) == expected
```

Multi-param multiply (cross-product):

```python
@pytest.mark.parametrize("x", [1, 2, 3])
@pytest.mark.parametrize("y", ['a', 'b'])
def test_combinations(x, y):
    # runs 6 times: (1,'a'), (1,'b'), (2,'a'), ...
    pass
```

## Step 6 - Markers + skip/xfail

```python
@pytest.mark.skip(reason="Requires staging DB")
def test_skip_example():
    pass

@pytest.mark.skipif(sys.version_info < (3, 11), reason="Python 3.11+ syntax")
def test_modern_syntax():
    pass

@pytest.mark.xfail(reason="Known bug; tracked in JIRA-1234")
def test_known_failure():
    assert 1 == 2

@pytest.mark.slow
def test_long_running():
    pass
```

Filter: `pytest -m "not slow"` skips slow-marked tests.

## Step 7 - Mocking with pytest-mock

```python
def test_with_mock(mocker):
    mock_api = mocker.patch('mymodule.api_client.fetch')
    mock_api.return_value = {'id': 1, 'name': 'Alice'}

    result = my_function()
    mock_api.assert_called_once_with('/users')
    assert result == {'id': 1, 'name': 'Alice'}
```

`mocker` fixture from `pytest-mock` wraps `unittest.mock.patch` with
auto-cleanup at test end.

## Step 8 - Async (pytest-asyncio)

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_async_function():
    result = await fetch_data()
    assert result == 'expected'

# Or set asyncio_mode = "auto" in pyproject.toml to skip the marker
```

## Step 9 - Coverage with pytest-cov

```bash
pytest --cov=src --cov-report=term-missing --cov-report=html --cov-report=xml \
       --cov-fail-under=80
```

`--cov-fail-under=N` fails the run if coverage drops below N%.

In `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src"]
branch = true
omit = ["**/__init__.py", "**/types.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
fail_under = 80
```

## Step 10 - Fast-feedback flags

```bash
pytest --lf            # only re-run last-failed tests
pytest --ff            # run last-failed first, then the rest
pytest -x              # stop on first failure
pytest -k "name_pat"   # only tests matching name pattern
pytest -v              # verbose
pytest -s              # don't capture stdout (see print() output)
pytest -p no:cacheprovider   # disable test-cache (CI cache-clean runs)
```

## Step 11 - CI integration

```yaml
- run: pip install -e .[dev]
- run: pytest --cov --cov-report=xml --cov-fail-under=80 --junitxml=junit.xml
- uses: codecov/codecov-action@v4
  with: { files: coverage.xml }
```

For parallel execution, add `pytest-xdist`:

```bash
pytest -n auto   # uses CPU count
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `setUp` / `tearDown` (TestCase style) instead of fixtures | Loses dependency injection benefits | Use fixtures (Step 4) |
| Skip `--strict-markers` | Typos in markers silently skip tests | Always set in config (Step 3) |
| Fixture with `scope='session'` for stateful resources | State leaks across tests | Function-scope unless setup expensive |
| `pytest -k 'expr'` in CI to skip "slow" tests | Brittle string match | Use `-m` markers (Step 6) |
| Skip `--cov-fail-under` in CI | Coverage drops silently over time | Always gate coverage (Step 9) |

## Limitations

- Plugin ecosystem is large; conflicting plugins can cause subtle issues.
- Fixture-scope reasoning has learning curve.
- `assert` rewriting requires pytest's importer; some patterns
  (running tests as scripts) bypass it.
- Async support requires pytest-asyncio; built-in support is limited.

## References

- [pt-docs][pt-docs] - official documentation
- pytest.org - landing
- pypi.org/project/pytest-mock - pytest-mock plugin
- pypi.org/project/pytest-asyncio - async support
- pypi.org/project/pytest-xdist - parallel execution
- [`unittest-tests`](../unittest-tests/SKILL.md),
  [`doctest-tests`](../doctest-tests/SKILL.md),
  [`nose2-tests`](../nose2-tests/SKILL.md) - sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md) - test code hygiene
