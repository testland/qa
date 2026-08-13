---
name: python-unit-tests
description: "Python unit testing with pytest as the primary framework - fixtures (`@pytest.fixture` scopes, `conftest.py`), `@pytest.mark.parametrize` table-driven tests, markers (`skip` / `xfail` / custom with `--strict-markers`), `pyproject.toml` config, mocking via pytest-mock, coverage gating with pytest-cov (`--cov-fail-under`), parallel runs with pytest-xdist, and CI wiring - plus stdlib `unittest` (TestCase, unittest.mock, discovery) and `doctest` (docstring examples, directives) as references. Includes framework choice (pytest for new code; match an existing unittest convention; doctest only for documented examples) and test-authoring conventions (framework detection from pyproject.toml/setup.cfg/tox.ini, layout matching, no fabricated attributes). Use for any Python unit-test task: setting up pytest, writing fixtures or parametrized tests, mocking, gating coverage, wiring CI, or maintaining unittest/doctest suites. For async tests, see pytest-asyncio-patterns."
---

# python-unit-tests

## Overview

Per [docs.pytest.org/en/stable][pt-docs]:

[pt-docs]: https://docs.pytest.org/en/stable/

pytest is the de facto Python test framework. Unlike stdlib `unittest`, it
uses function-style tests (no `TestCase`), fixture-based dependency
injection, parametrize for data-driven tests, and plain-`assert` rewriting
for diff-rich failures.

Lifecycle scope: configure / run / fixtures / mocking / coverage / CI. Test
code hygiene (assertions, AAA, mocking anti-patterns) is in
`test-code-conventions` (qa-test-review plugin).

## Choosing a framework

1. **pytest for new code** - the modern default; migration from unittest is
   mostly mechanical because pytest runs `TestCase` classes natively.
2. **Match an existing unittest convention** when maintaining a legacy
   suite or constrained to stdlib-only (no pip install) →
   [references/unittest.md](references/unittest.md). `unittest.mock` is
   the canonical mocking library in either style.
3. **doctest** only for documentation-as-tests - executable examples in
   docstrings, not regression coverage →
   [references/doctest.md](references/doctest.md).
4. **Async code** → the standalone `pytest-asyncio-patterns` skill (loop
   scoping, modes, AsyncMock).

## Step 1 - Install

```bash
pip install pytest
# Common plugins:
pip install pytest-cov pytest-asyncio pytest-mock pytest-xdist
```

## Step 2 - First test

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

pytest auto-discovers via `test_*.py` / `*_test.py` filenames and `test_*` /
`Test*` function/class names ([pt-docs][pt-docs]).

## Step 3 - Configuration

`pytest.ini` (or `pyproject.toml` `[tool.pytest.ini_options]` / `setup.cfg`
`[tool:pytest]`):

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

`--strict-markers` rejects undeclared marker names - catches typos like
`@pytest.mark.skipp` (silently skipped before).

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
`session`. Choose the narrowest scope that doesn't waste setup time.
`conftest.py` shares fixtures across test files in the same directory (and
subdirectories). Fixtures are requested by naming them as test-function
parameters - pytest "searches for fixtures that have the same names as
those parameters"
([docs.pytest.org/how-to/fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)).

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

Stacked `@pytest.mark.parametrize` decorators multiply into a
cross-product ([docs.pytest.org/how-to/parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html)).

## Step 6 - Markers + skip/xfail

```python
@pytest.mark.skip(reason="Requires staging DB")
def test_skip_example(): ...

@pytest.mark.skipif(sys.version_info < (3, 11), reason="Python 3.11+ syntax")
def test_modern_syntax(): ...

@pytest.mark.xfail(reason="Known bug; tracked in JIRA-1234")
def test_known_failure():
    assert 1 == 2

@pytest.mark.slow
def test_long_running(): ...
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

The `mocker` fixture from `pytest-mock` wraps `unittest.mock.patch` with
auto-cleanup at test end. Patch target rule: patch where the name is
*used*, not where it's *defined* - if `mymodule.py` does
`from api import fetch_user`, patch `mymodule.fetch_user`, not
`api.fetch_user` (see [references/unittest.md](references/unittest.md) for
the full `unittest.mock` catalog).

## Step 8 - Coverage with pytest-cov

```bash
pytest --cov=src --cov-report=term-missing --cov-report=html --cov-report=xml \
       --cov-fail-under=80
```

`--cov-fail-under=N` fails the run if coverage drops below N%. Config-side
equivalent in `pyproject.toml`:

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

`branch = true` enables branch (not just line) coverage; `exclude_lines`
drops never-coverable lines from the denominator.

## Step 9 - CI and parallel execution

```yaml
- run: pip install -e .[dev]
- run: pytest --cov --cov-report=xml --cov-fail-under=80 --junitxml=junit.xml
- uses: codecov/codecov-action@v4
  with: { files: coverage.xml }
```

`--junitxml=junit.xml` emits a JUnit report (feeds `junit-xml-analysis` in
qa-test-reporting); `--cov-report=xml` emits `coverage.xml` for the
uploader. Parallel: `pytest -n auto` via pytest-xdist distributes tests
across workers; pytest-cov merges per-worker data automatically.

## Step 10 - Fast-feedback flags

```bash
pytest --lf            # only re-run last-failed tests
pytest --ff            # run last-failed first, then the rest
pytest -x              # stop on first failure
pytest -k "name_pat"   # only tests matching name pattern
pytest -s              # don't capture stdout (see print() output)
```

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect the framework, never assume.** Check `pyproject.toml`
   (`[tool.pytest.ini_options]` or pytest in dev-deps), `setup.cfg`
   (`[tool:pytest]`), `tox.ini` (`[pytest]`); then grep existing tests -
   `unittest.TestCase` subclasses → unittest; otherwise default to pytest.
   Doctest is opt-in per-module, only when the spec explicitly asks for
   in-docstring examples. Conflicting signals → stop and ask.
2. **Match the layout.** Existing `tests/` dir → `tests/test_<module>.py`;
   co-located `test_<module>.py` → match it. For doctest, patch the source
   module's docstring instead of creating a file.
3. **One spec → one new test**; never modify existing test methods and
   never fabricate attributes/methods the target module does not expose.
4. **Assert the spec's concrete outcome** - no `assert True` /
   `self.assertTrue(True)` smoke asserts. Plain `assert` in pytest
   functions; `self.assertEqual` in TestCase classes (diff-aware).
5. **Use present data peers only**: `mimesis` in dev-deps → locale-aware
   fixtures via `synthetic-data-toolkit` (qa-test-data); never install
   packages as a side effect. 3+ interacting inputs → generate the case
   set with `pairwise-test-case-generator` (qa-test-data), then map through
   `@pytest.mark.parametrize`.
6. **Refuse universally-quantified specs** ("holds for all valid inputs") -
   that is property-based-test scope (qa-property-based plugin).
7. **Beware mixed lifecycles**: pytest's `setup_method` runs alongside (not
   instead of) `setUp` on TestCase subclasses - pick one mechanism per
   class. Avoid mutable default arguments in test helpers (shared across
   calls; leaks state).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `setUp` / `tearDown` (TestCase style) in new pytest code | Loses dependency-injection benefits | Fixtures (Step 4) |
| Skip `--strict-markers` | Marker typos silently skip tests | Always set in config (Step 3) |
| `scope='session'` fixtures for stateful resources | State leaks across tests | Function scope unless setup is expensive |
| `pytest -k 'expr'` in CI to skip slow tests | Brittle string match | `-m` markers (Step 6) |
| Skip `--cov-fail-under` in CI | Coverage drops silently over time | Always gate coverage (Step 8) |
| doctest as the only test surface for non-trivial logic | Brittle string matching; no fixtures/mocks | pytest for regression coverage; doctest for examples |

## Limitations

- Plugin ecosystem is large; conflicting plugins can cause subtle issues.
- Fixture-scope reasoning has a learning curve.
- `assert` rewriting requires pytest's importer; running tests as scripts
  bypasses it.
- Built-in async support is limited - use pytest-asyncio (see
  `pytest-asyncio-patterns`).

## References

- [pt-docs][pt-docs] - official pytest documentation
- docs.pytest.org/en/stable/how-to/fixtures.html - fixtures
- docs.pytest.org/en/stable/how-to/parametrize.html - parametrize
- pypi.org/project/pytest-mock - pytest-mock plugin
- pypi.org/project/pytest-xdist - parallel execution
- [references/unittest.md](references/unittest.md) - stdlib unittest +
  unittest.mock
- [references/doctest.md](references/doctest.md) - stdlib doctest
- `pytest-asyncio-patterns` - async test patterns (standalone sibling)
- `test-code-conventions` (qa-test-review) - test code hygiene
