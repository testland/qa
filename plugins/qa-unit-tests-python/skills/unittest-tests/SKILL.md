---
name: unittest-tests
description: "Configures and runs Python's stdlib unittest - TestCase + setUp/tearDown lifecycle hooks, assertion catalog (assertEqual / assertRaises / assertIn / assertAlmostEqual), unittest.mock module (Mock / MagicMock / patch / patch.object / patch.dict), test discovery via `python -m unittest discover`, subTest for parametrized cases, expectedFailure decorator. Use when constrained to stdlib-only (no pip install) or migrating legacy unittest codebases."
---

# unittest-tests

## Overview

Per [docs.python.org/3/library/unittest.html][ut-docs]:

[ut-docs]: https://docs.python.org/3/library/unittest.html

`unittest` is Python's stdlib testing framework, modeled on JUnit
(xUnit family). Distinguishing properties:

- **Stdlib**: no pip install required - runs anywhere Python runs.
- **Class-based**: tests as `TestCase` methods (vs pytest's
  function-style).
- **Mock module bundled**: `unittest.mock` is the canonical Python
  mocking library (used even by pytest projects).

For new projects, `pytest-tests` is
generally preferred. unittest persists in stdlib-only contexts +
legacy maintenance.

## When to use

- Constrained to Python stdlib (no third-party deps).
- Maintaining legacy unittest codebase.
- Specifically using `unittest.mock` patterns even with pytest
  (pytest test bodies can use unittest.mock directly).
- Embedded environments where pip install isn't possible.

## Step 1 - First test

Per [ut-docs][ut-docs]:

```python
# test_sum.py
import unittest

def sum(a, b):
    return a + b

class TestSum(unittest.TestCase):
    def test_adds_1_and_2(self):
        self.assertEqual(sum(1, 2), 3)

    def test_adds_negative(self):
        self.assertEqual(sum(-1, 1), 0)

if __name__ == '__main__':
    unittest.main()
```

Run:

```bash
python -m unittest test_sum.py        # specific file
python -m unittest                     # discover from cwd
python -m unittest discover -s tests/ -p 'test_*.py'
```

## Step 2 - TestCase lifecycle hooks

```python
class TestUserService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # runs once before all tests in class
        cls.db = create_test_db()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        # runs before each test
        self.user = create_user(self.db)

    def tearDown(self):
        # runs after each test
        self.db.rollback()

    def test_user_creation(self):
        self.assertEqual(self.user.id, 1)
```

## Step 3 - Assertion catalog

Per [ut-docs][ut-docs]:

| Method | Use |
|---|---|
| `assertEqual(a, b)` / `assertNotEqual(a, b)` | Equality |
| `assertTrue(x)` / `assertFalse(x)` | Boolean |
| `assertIs(a, b)` / `assertIsNot(a, b)` | Identity (is) |
| `assertIsNone(x)` / `assertIsNotNone(x)` | None |
| `assertIn(a, b)` / `assertNotIn(a, b)` | Membership |
| `assertIsInstance(a, type)` | Type check |
| `assertRaises(Exception)` | Sync raise (context manager + decorator forms) |
| `assertRaisesRegex(Exception, regex)` | Raise + message match |
| `assertWarns(Warning)` | Warning emission |
| `assertAlmostEqual(a, b, places=N)` | Float comparison |
| `assertGreater(a, b)` / `assertGreaterEqual(a, b)` | Numeric |
| `assertCountEqual(a, b)` | Same elements regardless of order |
| `assertDictContainsSubset(subset, dict)` | Partial dict match (deprecated; use `<=` operator) |

## Step 4 - `unittest.mock` patterns

Per [docs.python.org/3/library/unittest.mock.html][mock-docs]:

[mock-docs]: https://docs.python.org/3/library/unittest.mock.html

```python
from unittest.mock import Mock, MagicMock, patch, patch.object

# Standalone mocks
m = Mock()
m.method.return_value = 42
result = m.method(5)
m.method.assert_called_once_with(5)

# MagicMock supports magic methods (__len__, __iter__, etc.)
mm = MagicMock()
mm.__len__.return_value = 5
assert len(mm) == 5

# Patch a function in the target module
@patch('mymodule.fetch_user')
def test_with_patched_fetch(mock_fetch):
    mock_fetch.return_value = {'id': 1}
    result = my_function()
    assert result == 'expected'

# Context-manager form
def test_with_context_patch():
    with patch('mymodule.fetch_user') as mock_fetch:
        mock_fetch.return_value = {'id': 1}
        result = my_function()

# Patch an attribute
@patch.object(SomeClass, 'method', return_value='mocked')
def test_class_method(mock_method):
    obj = SomeClass()
    assert obj.method() == 'mocked'

# Patch a dictionary
@patch.dict('os.environ', {'API_KEY': 'test-key'})
def test_with_env():
    assert os.environ['API_KEY'] == 'test-key'
```

**Patch target rule:** patch where the function is *used*, not
where it's *defined*. If `mymodule.py` does `from api import
fetch_user`, patch `mymodule.fetch_user`, not `api.fetch_user`.

## Step 5 - subTest for parametrization

```python
class TestCalculator(unittest.TestCase):
    def test_addition_cases(self):
        cases = [(1, 2, 3), (0, 0, 0), (-1, 1, 0), (100, 200, 300)]
        for a, b, expected in cases:
            with self.subTest(a=a, b=b):
                self.assertEqual(sum(a, b), expected)
```

`subTest` reports each iteration as a separate failure if it fails - without it, the loop stops at the first failure.

## Step 6 - Skip + expected failure

```python
@unittest.skip("Requires staging DB")
def test_skipped():
    pass

@unittest.skipIf(sys.version_info < (3, 11), "Python 3.11+ syntax")
def test_modern():
    pass

@unittest.expectedFailure
def test_known_bug():
    self.assertEqual(1, 2)   # passes the test (because it's expected to fail)
```

## Step 7 - Test discovery

```bash
# From cwd
python -m unittest discover

# From specific dir + pattern
python -m unittest discover -s tests/ -p 'test_*.py'

# Verbose
python -m unittest discover -v

# Specific test
python -m unittest tests.test_user.TestUser.test_creation
```

## Step 8 - pytest interop

`pytest` runs `unittest.TestCase` classes natively. Migration path:

1. Keep TestCase classes for now; pytest discovers + runs them.
2. New tests as pytest functions.
3. Gradually convert TestCase to functions over time.
4. unittest.mock continues to work in either style.

## Step 9 - CI integration

```yaml
- run: pip install -e .[dev]
- run: python -m unittest discover -s tests/ -v
# Or with coverage:
- run: coverage run -m unittest discover && coverage report --fail-under=80
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `assertTrue(x == y)` instead of `assertEqual(x, y)` | Generic boolean; loses diff in failure | Use specific assert (Step 3) |
| Patch where defined, not where used | Patch silently doesn't apply | Patch where USED (Step 4 rule) |
| Loop over cases without `subTest` | First failure stops the loop | Use `subTest` (Step 5) |
| Use `setUp` to populate self.* attributes that overlap test names | Confusion about what's fixture vs result | Distinct naming |
| Forget `if __name__ == '__main__': unittest.main()` for direct-run | Can't run via `python test.py` | Always include (Step 1) |

## Limitations

- Class-based syntax is verbose vs pytest function-style.
- No built-in parametrize beyond `subTest` (per-case reporting limited).
- Async testing requires `unittest.IsolatedAsyncioTestCase` (Python 3.8+);
  less polished than pytest-asyncio.
- No fixture-scope concept; setUp/tearDown is per-test only
  (setUpClass for per-class).

## References

- [ut-docs][ut-docs] - unittest reference
- [mock-docs][mock-docs] - unittest.mock reference
- `pytest-tests`,
  `doctest-tests`,
  `nose2-tests` - sister tools
- `test-code-conventions` - test code hygiene
