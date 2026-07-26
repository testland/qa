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
python -m unittest test_sum.py     # run this file (discovery invocations: Step 7)
```

**Verify:** a passing run ends with `OK` after a `Ran N tests` summary line. If it prints `FAILED (failures=N)`, read the `AssertionError` diff for expected-vs-actual, fix the code or the assertion, and re-run until you get `OK` before adding more tests.

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

## Step 3 - Assertions

Assert with the method specific to the check (`assertEqual`, `assertIn`,
`assertRaises`, `assertAlmostEqual`, ...), never `assertTrue(x == y)`. Full
catalog + the diff-on-failure rationale: [references/assertions-and-mock.md](references/assertions-and-mock.md).

## Step 4 - `unittest.mock` patterns

Patch where the name is *used*, not where it's *defined*. The full rule (with a
worked import example) plus Mock / MagicMock / patch / patch.object / patch.dict
patterns are in [references/assertions-and-mock.md](references/assertions-and-mock.md); the Worked example below runs the
patch-where-used pattern end to end.

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

## Worked example

`greeting.py` builds a welcome string from a user fetched over HTTP:

```python
# greeting.py
from api import fetch_user

def welcome(user_id):
    user = fetch_user(user_id)
    return f"Hi {user['name']}"
```

Test it without hitting the network - patch `fetch_user` where `greeting` uses
it (not where `api` defines it), then assert on the formatted result:

```python
# tests/test_greeting.py
import unittest
from unittest.mock import patch
from greeting import welcome

class TestWelcome(unittest.TestCase):
    @patch('greeting.fetch_user')
    def test_welcome_names_user(self, mock_fetch):
        mock_fetch.return_value = {'name': 'Ada'}
        self.assertEqual(welcome(1), 'Hi Ada')
        mock_fetch.assert_called_once_with(1)

if __name__ == '__main__':
    unittest.main()
```

Run `python -m unittest discover -s tests/ -v`. The test passes: the patch
replaced the real `fetch_user`, `assertEqual` confirmed the greeting string, and
`assert_called_once_with` confirmed the id was forwarded once.

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

[mock-docs]: https://docs.python.org/3/library/unittest.mock.html

- [ut-docs][ut-docs] - unittest reference
- [mock-docs][mock-docs] - unittest.mock reference
- [references/assertions-and-mock.md](references/assertions-and-mock.md) - full assertion catalog + mock patterns
- `pytest-tests`,
  `doctest-tests`,
  `nose2-tests` - sister tools
- `test-code-conventions` - test code hygiene
