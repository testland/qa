---
name: pytest-asyncio-patterns
description: "Configures and runs async Python tests with pytest-asyncio: installs the plugin, selects asyncio_mode (auto vs strict), scopes event loops (function/class/module/session), writes async fixtures with @pytest_asyncio.fixture, mocks coroutines with AsyncMock, and tests FastAPI (httpx.AsyncClient + ASGITransport) and aiohttp (aiohttp_client fixture) applications. Use when a Python project contains async def test_ functions, FastAPI/aiohttp endpoints, or any asyncio-based code that needs pytest integration. Do NOT use for general pytest fixture design, parametrize patterns, or conftest.py structure without an asyncio-specific problem (event-loop scoping, mode config, AsyncMock, ASGI client): use python-unit-tests for those."
metadata:
  keywords: "pytest, asyncio, async, fastapi, aiohttp, httpx, AsyncMock, event-loop, async-fixtures"
---

# pytest-asyncio-patterns

## Overview

Per [pytest-asyncio.readthedocs.io](https://pytest-asyncio.readthedocs.io/en/latest/):

pytest-asyncio runs `async def` test functions under pytest; without it,
coroutine tests are collected but never awaited. It provides the
`@pytest.mark.asyncio` marker (or an auto-mode that drops the marker),
async-aware fixtures with configurable event-loop scoping, and works with
FastAPI/Starlette (via `httpx.AsyncClient`) and aiohttp (via pytest-aiohttp).

Nearest neighbor: `python-unit-tests` covers the full framework but treats async
in one paragraph. This skill covers the asyncio path end to end: modes, loop
scoping, async fixtures, `AsyncMock`, and framework client patterns.

## Step 1 - Install

```bash
pip install pytest-asyncio
# For FastAPI / httpx testing:
pip install httpx
# For aiohttp testing:
pip install pytest-aiohttp
```

Verify the plugin is active:

```bash
pytest --co -q   # should show no "PytestUnraisableExceptionWarning" about coroutines
```

## Step 2 - Choose a mode

`asyncio_mode` has two practical values:

| Mode | Behavior |
|---|---|
| `strict` (default) | Only tests marked `@pytest.mark.asyncio` are collected as async. Async fixtures must use `@pytest_asyncio.fixture`. |
| `auto` | All `async def test_*` functions are automatically treated as asyncio tests. `@pytest.fixture` works for async fixtures too. |

Set in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

Or override per run: `pytest --asyncio-mode=strict`. The CLI flag takes
precedence over the config file when both are present.

**Recommendation:** use `auto` for pure-asyncio projects; use `strict` when
the project mixes async test libraries (e.g., pytest-trio alongside
pytest-asyncio) to avoid mode conflicts.

## Step 3 - Mark individual tests (strict mode)

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_returns_data():
    result = await fetch_data()
    assert result == {"status": "ok"}
```

Apply the marker at module level to avoid repeating it:

```python
# test_api.py
import pytest

pytestmark = pytest.mark.asyncio

async def test_one():
    assert await compute() == 42

async def test_two():
    assert await status() == "ready"
```

In auto mode, neither the decorator nor `pytestmark` is required.

## Step 4 - Event-loop scoping

The `loop_scope` parameter controls how long an event loop lives:

| Scope | Loop lifetime |
|---|---|
| `function` (default) | One loop per test function |
| `class` | One loop shared across all tests in the class |
| `module` | One loop shared across all tests in the file |
| `package` | One loop per package (subdirectory); subpackages do not share with parents |
| `session` | One loop for the entire test session |

Function-scope (the default) provides the strongest isolation. Wider scopes
are useful when spinning up a database connection or network server is
expensive.

```python
# Share a loop across all tests in a module
@pytest.mark.asyncio(loop_scope="module")
class TestDatabaseSuite:
    async def test_insert(self):
        await db.insert({"key": "val"})

    async def test_read(self):
        result = await db.get("key")
        assert result == "val"
```

Configure the default loop scope for all tests in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_test_loop_scope = "function"
```

`asyncio_default_test_loop_scope` defaults to `function` when unset.

## Step 5 - Async fixtures

In **strict mode**, async fixtures must use `@pytest_asyncio.fixture` (not
`@pytest.fixture`). In **auto mode**, `@pytest.fixture` works for async
fixtures too.

```python
import pytest_asyncio

# Strict mode: explicit decorator required
@pytest_asyncio.fixture
async def db_pool():
    pool = await create_pool(dsn="postgresql://localhost/test")
    yield pool
    await pool.close()

# Auto mode: standard decorator works
@pytest.fixture
async def http_session():
    async with aiohttp.ClientSession() as session:
        yield session
```

Scope async fixtures the same way as sync fixtures:

```python
@pytest_asyncio.fixture(scope="module")
async def app_server():
    server = await start_server(port=0)
    yield server
    await server.stop()
```

`asyncio_default_fixture_loop_scope` determines which event loop async
fixtures run in; it defaults to matching the fixture's own scope.

## Step 6 - Mock async functions with AsyncMock

`AsyncMock` (stdlib since Python 3.8) makes a mock object behave as a
coroutine function.
`MagicMock` does not: calling it returns a coroutine object but
`inspect.iscoroutinefunction(MagicMock())` is `False`, which breaks
code that checks type before awaiting.

```python
from unittest.mock import AsyncMock, patch
import pytest

@pytest.mark.asyncio
async def test_service_calls_repository():
    mock_repo = AsyncMock()
    mock_repo.find_by_id.return_value = {"id": 1, "name": "Alice"}

    service = UserService(repo=mock_repo)
    result = await service.get_user(1)

    mock_repo.find_by_id.assert_awaited_once_with(1)
    assert result["name"] == "Alice"
```

Patching an async import path (`new_callable=AsyncMock`), the full
await-assertion table (`assert_awaited_once_with`, `assert_awaited_with`,
`assert_any_await`, `assert_not_awaited`, `await_count`), and `side_effect`
semantics: [references/asyncmock-assertions.md](references/asyncmock-assertions.md).

## Step 7 - Test FastAPI and aiohttp apps

FastAPI is an ASGI framework. Async tests use `httpx.AsyncClient` with
`ASGITransport` to drive the app in-process (no real TCP port needed).

```python
import pytest
from httpx import ASGITransport, AsyncClient
from myapp.main import app

@pytest.mark.asyncio
async def test_read_root():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
```

Firing FastAPI lifespan events (`asgi-lifespan`), the aiohttp
`aiohttp_client` fixture, and running tests on multiple backends with anyio:
[references/framework-clients.md](references/framework-clients.md).

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `@pytest.fixture` for async fixture in strict mode | pytest-asyncio ignores it; fixture runs sync | Use `@pytest_asyncio.fixture` in strict mode |
| `MagicMock()` for an async function | Awaiting it raises `TypeError` | Use `AsyncMock()` (stdlib since Python 3.8) |
| `assert_called_once_with` on an `AsyncMock` | Checks calls, not awaits; passes even if mock was never awaited | Use `assert_awaited_once_with` |
| `scope="session"` async fixture without matching loop scope | Fixture and test run in different loops; raises "attached to a different loop" error | Set `asyncio_default_fixture_loop_scope = "session"` or use `loop_scope="session"` on the test |
| Forgetting `asyncio_mode = "auto"` in aiohttp tests | Tests collected but not run as async | Add `asyncio_mode = "auto"` to `pyproject.toml` (required by pytest-aiohttp) |
| `asyncio.run()` inside a test body | Creates a nested event loop; raises `RuntimeError` in Python 3.10+ | Let pytest-asyncio manage the loop; just `await` directly |

## Limitations

- pytest-asyncio does not support `anyio`-native primitives (TaskGroup,
  CancelScope) out of the box; use the anyio pytest plugin
  ([references/framework-clients.md](references/framework-clients.md)) instead.
- `asyncio_mode = "auto"` conflicts with anyio auto mode when both plugins
  are active in the same session.
- The `event_loop_policy` fixture is deprecated in recent versions of
  pytest-asyncio; migrate to the `pytest_asyncio_loop_factories` hook.
- `AsyncClient` + `ASGITransport` does not exercise real network routing;
  TCP-level integration tests still require a running server.

## References

- [pytest-asyncio.readthedocs.io](https://pytest-asyncio.readthedocs.io/en/latest/) - official docs
- [pytest-asyncio configuration](https://pytest-asyncio.readthedocs.io/en/latest/reference/configuration.html) - asyncio_mode, asyncio_default_fixture_loop_scope, asyncio_default_test_loop_scope
- [pytest-asyncio markers](https://pytest-asyncio.readthedocs.io/en/latest/reference/markers/index.html) - loop_scope values
- [pytest-asyncio concepts](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html) - auto vs strict mode, fixture decorator rules
- [docs.python.org AsyncMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock) - stdlib AsyncMock reference
- [fastapi.tiangolo.com async tests](https://fastapi.tiangolo.com/advanced/async-tests/) - ASGITransport + AsyncClient pattern
- [docs.aiohttp.org testing](https://docs.aiohttp.org/en/stable/testing.html) - aiohttp_client fixture
- [anyio.readthedocs.io testing](https://anyio.readthedocs.io/en/stable/testing.html) - anyio backend parametrization
- `python-unit-tests` - full pytest framework (fixtures, parametrize, coverage, CI)
