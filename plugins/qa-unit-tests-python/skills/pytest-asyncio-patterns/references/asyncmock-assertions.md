# AsyncMock await assertions and side_effect

Await-specific assertions and `side_effect` semantics for
`unittest.mock.AsyncMock` (stdlib since Python 3.8). The SKILL.md spine keeps
the primary AsyncMock example; the exhaustive assertion reference is here.

Source: [docs.python.org AsyncMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock).

## Patch an async method on an import path

```python
@pytest.mark.asyncio
async def test_external_call():
    with patch("myapp.clients.redis.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = b"cached"
        result = await fetch_from_cache("key")
    mock_get.assert_awaited_once_with("key")
    assert result == b"cached"
```

`new_callable=AsyncMock` is required so `patch` installs a coroutine-returning
mock rather than a plain `MagicMock`.

## Await-specific assertions

| Assertion | Meaning |
|---|---|
| `assert_awaited_once_with(*a, **kw)` | Awaited exactly once with these args |
| `assert_awaited_with(*a, **kw)` | Last await had these args |
| `assert_any_await(*a, **kw)` | Ever awaited with these args |
| `assert_not_awaited()` | Never awaited |
| `await_count` | How many times awaited (attribute, not assertion) |

The `assert_called_*` family checks that the mock was *called*, not that it
was *awaited*; a coroutine mock can be called without being awaited, so prefer
the `assert_awaited_*` family for async code.

## side_effect on AsyncMock

`side_effect` on `AsyncMock` behaves the same as on a sync mock: a callable is
invoked and its result returned; an exception class (or instance) is raised
when the mock is awaited; an iterable returns successive values on each await.
