# unittest assertions and mock reference

Companion catalog for the `unittest-tests` skill: the full assertion table and
the `unittest.mock` patterns, pulled out of the SKILL spine.

## Assertion catalog

Per [ut-docs][ut-docs]:

[ut-docs]: https://docs.python.org/3/library/unittest.html

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

Prefer the specific assert over `assertTrue(x == y)`: the specific method prints
a useful diff on failure.

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

**Patch target rule:** patch where the function is *used*, not where it's
*defined*. If `mymodule.py` does `from api import fetch_user`, patch
`mymodule.fetch_user`, not `api.fetch_user`.
