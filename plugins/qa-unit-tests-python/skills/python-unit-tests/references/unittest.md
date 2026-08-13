# unittest - Python stdlib testing (maintenance reference)

Companion reference for `python-unit-tests`. Consult when constrained to
stdlib-only (no pip install), maintaining a legacy unittest codebase, or
using `unittest.mock` patterns from pytest test bodies.

Per [docs.python.org/3/library/unittest.html][ut-docs]:

[ut-docs]: https://docs.python.org/3/library/unittest.html

`unittest` is Python's stdlib testing framework, modeled on JUnit (xUnit
family): no pip install required, class-based tests as `TestCase` methods,
and `unittest.mock` bundled - the canonical Python mocking library even in
pytest projects.

## First test

```python
# test_sum.py
import unittest

def sum(a, b):
    return a + b

class TestSum(unittest.TestCase):
    def test_adds_1_and_2(self):
        self.assertEqual(sum(1, 2), 3)

if __name__ == '__main__':
    unittest.main()
```

Run `python -m unittest test_sum.py`. A passing run ends with `OK` after a
`Ran N tests` summary; `FAILED (failures=N)` prints the `AssertionError`
diff.

## TestCase lifecycle hooks

`setUpClass` / `tearDownClass` (classmethods, once per class) and `setUp` /
`tearDown` (per test). No fixture-scope concept beyond these two levels.

## Assertion catalog

Per [ut-docs][ut-docs] - assert with the method specific to the check,
never `assertTrue(x == y)` (the specific method prints a useful diff on
failure):

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

## `unittest.mock` patterns

Per [docs.python.org/3/library/unittest.mock.html][mock-docs]:

[mock-docs]: https://docs.python.org/3/library/unittest.mock.html

```python
from unittest.mock import Mock, MagicMock, patch

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
    ...

# Context-manager form
with patch('mymodule.fetch_user') as mock_fetch:
    mock_fetch.return_value = {'id': 1}
    ...

# Patch an attribute / a dictionary
@patch.object(SomeClass, 'method', return_value='mocked')
@patch.dict('os.environ', {'API_KEY': 'test-key'})
```

**Patch target rule:** patch where the function is *used*, not where it's
*defined*. If `mymodule.py` does `from api import fetch_user`, patch
`mymodule.fetch_user`, not `api.fetch_user`.

Worked example - `greeting.py` builds a welcome string from a user fetched
over HTTP:

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
```

## subTest for parametrization

```python
def test_addition_cases(self):
    cases = [(1, 2, 3), (0, 0, 0), (-1, 1, 0)]
    for a, b, expected in cases:
        with self.subTest(a=a, b=b):
            self.assertEqual(sum(a, b), expected)
```

`subTest` reports each iteration as a separate failure; without it the loop
stops at the first failure.

## Skip + expected failure

`@unittest.skip(reason)`, `@unittest.skipIf(cond, reason)`, and
`@unittest.expectedFailure` (the test passes because it is expected to
fail).

## Discovery and CI

```bash
python -m unittest discover                       # from cwd
python -m unittest discover -s tests/ -p 'test_*.py'
python -m unittest tests.test_user.TestUser.test_creation
# CI with coverage:
coverage run -m unittest discover && coverage report --fail-under=80
```

## pytest interop (migration path)

pytest runs `unittest.TestCase` classes natively: keep TestCase classes,
write new tests as pytest functions, convert gradually. `unittest.mock`
works in either style.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `assertTrue(x == y)` | Generic boolean; loses diff on failure | Specific assert method |
| Patch where defined, not where used | Patch silently doesn't apply | Patch where USED |
| Loop over cases without `subTest` | First failure stops the loop | `subTest` |
| Missing `if __name__ == '__main__': unittest.main()` | Can't run via `python test.py` | Always include |

## Limitations

- Class-based syntax is verbose vs pytest function-style.
- No built-in parametrize beyond `subTest`.
- Async testing requires `unittest.IsolatedAsyncioTestCase` (Python 3.8+);
  less polished than pytest-asyncio.

## References

- [ut-docs][ut-docs] - unittest reference
- [mock-docs][mock-docs] - unittest.mock reference
