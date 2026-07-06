---
name: pytest-asyncio-patterns
description: "Configures and runs async Python tests with pytest-asyncio: installs the plugin, selects asyncio_mode (auto vs strict), scopes event loops (function/class/module/session), writes async fixtures with @pytest_asyncio.fixture, mocks coroutines with AsyncMock, and tests FastAPI (httpx.AsyncClient + ASGITransport) and aiohttp (aiohttp_client fixture) applications. Use when a Python project contains async def test_ functions, FastAPI/aiohttp endpoints, or any asyncio-based code that needs pytest integration. Do NOT use for general pytest fixture design, parametrize patterns, or conftest.py structure without an asyncio-specific problem (event-loop scoping, mode config, AsyncMock, ASGI client): use pytest-tests for those."
keywords: ["pytest", "asyncio", "async", "fastapi", "aiohttp", "httpx", "AsyncMock", "event-loop", "async-fixtures"]
---

# pytest-asyncio-patterns

## Overview

Per [pytest-asyncio.readthedocs.io](https://pytest-asyncio.readthedocs.io/en/latest/):

pytest-asyncio is the standard plugin for running `async def` test functions
under pytest. Without it, pytest collects but cannot execute coroutine tests
(they return a coroutine object instead of running). The plugin provides:

- A marker (`@pytest.mark.asyncio`) and an auto-mode that removes the need
  for the marker entirely.
- Async-aware fixture infrastructure with configurable event-loop scoping.
- Compatibility with FastAPI/Starlette ASGI apps via `httpx.AsyncClient` and
  with aiohttp apps via `pytest-aiohttp`.

Nearest neighbor differentiation: `pytest-tests` (the sibling skill) covers
the full pytest framework but treats async in one paragraph (Step 8). This
skill covers the asyncio integration path end to end: modes, loop scoping,
async fixtures, `AsyncMock`, and framework-specific client patterns.

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

Per [pytest-asyncio configuration docs](https://pytest-asyncio.readthedocs.io/en/latest/reference/configuration.html),
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

Or override per run: `pytest --asyncio-mode=strict`.

The CLI flag takes precedence over the config file when both are present
(per [configuration docs](https://pytest-asyncio.readthedocs.io/en/latest/reference/configuration.html)).

**Recommendation:** use `auto` for pure-asyncio projects; use `strict` when
the project mixes async test libraries (e.g., pytest-trio alongside
pytest-asyncio) to avoid mode conflicts.

## Step 3 - Mark individual tests (strict mode)

Per [pytest-asyncio.readthedocs.io](https://pytest-asyncio.readthedocs.io/en/latest/):

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

Per [pytest-asyncio marker reference](https://pytest-asyncio.readthedocs.io/en/latest/reference/markers/index.html),
the `loop_scope` parameter controls how long an event loop lives:

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

Per [configuration docs](https://pytest-asyncio.readthedocs.io/en/latest/reference/configuration.html),
`asyncio_default_test_loop_scope` defaults to `function` when unset.

## Step 5 - Async fixtures

Per [pytest-asyncio concepts](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html):

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

Per [configuration docs](https://pytest-asyncio.readthedocs.io/en/latest/reference/configuration.html),
`asyncio_default_fixture_loop_scope` determines which event loop async
fixtures run in; it defaults to matching the fixture's own scope.

## Step 6 - Mock async functions with AsyncMock

Per [docs.python.org AsyncMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock)
(stdlib since Python 3.8):

`AsyncMock` makes a mock object behave as a coroutine function.
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

Patch an async method on an import path:

```python
@pytest.mark.asyncio
async def test_external_call():
    with patch("myapp.clients.redis.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = b"cached"
        result = await fetch_from_cache("key")
    mock_get.assert_awaited_once_with("key")
    assert result == b"cached"
```

Key await-specific assertions from
[docs.python.org](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock):

| Assertion | Meaning |
|---|---|
| `assert_awaited_once_with(*a, **kw)` | Awaited exactly once with these args |
| `assert_awaited_with(*a, **kw)` | Last await had these args |
| `assert_any_await(*a, **kw)` | Ever awaited with these args |
| `assert_not_awaited()` | Never awaited |
| `await_count` | How many times awaited (attribute, not assertion) |

`side_effect` on `AsyncMock` behaves per
[docs.python.org](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock):
a callable is invoked and its result returned; an exception class is raised
when the mock is awaited; an iterable returns successive values.

## Step 7 - Test FastAPI apps

Per [fastapi.tiangolo.com/advanced/async-tests](https://fastapi.tiangolo.com/advanced/async-tests/):

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

`AsyncClient` does not fire lifespan events by default (per
[FastAPI docs](https://fastapi.tiangolo.com/advanced/async-tests/)). To
trigger `startup`/`shutdown` handlers, use `asgi-lifespan`:

```bash
pip install asgi-lifespan
```

```python
from asgi_lifespan import LifespanManager

@pytest_asyncio.fixture(scope="module")
async def live_app():
    async with LifespanManager(app) as manager:
        yield manager.app

@pytest.mark.asyncio(loop_scope="module")
async def test_with_lifespan(live_app):
    async with AsyncClient(
        transport=ASGITransport(app=live_app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
```

## Step 8 - Test aiohttp apps

Per [docs.aiohttp.org/testing](https://docs.aiohttp.org/en/stable/testing.html),
the `pytest-aiohttp` plugin provides an `aiohttp_client` fixture that
manages server startup and teardown:

```bash
pip install pytest-aiohttp
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

```python
from aiohttp import web

async def hello(request):
    return web.Response(text="Hello, world")

async def test_hello(aiohttp_client):
    app = web.Application()
    app.router.add_get("/", hello)
    client = await aiohttp_client(app)
    resp = await client.get("/")
    assert resp.status == 200
    text = await resp.text()
    assert text == "Hello, world"
```

Per [aiohttp testing docs](https://docs.aiohttp.org/en/stable/testing.html),
`aiohttp_client` returns a `TestClient` that starts the server on a random
port and shuts it down after the test.

## Step 9 - anyio as an alternative

Per [anyio.readthedocs.io/testing](https://anyio.readthedocs.io/en/stable/testing.html),
`anyio` ships its own pytest plugin that runs async tests on both asyncio
and Trio backends. Use it when the codebase is written against `anyio`
primitives or when multi-backend verification is needed.

```bash
pip install anyio[trio]
```

```python
import pytest

@pytest.mark.anyio
async def test_anyio_style():
    result = await compute()
    assert result == 42
```

Parametrize backends:

```python
# conftest.py
import pytest

@pytest.fixture(params=["asyncio", "trio"])
def anyio_backend(request):
    return request.param
```

Per [anyio docs](https://anyio.readthedocs.io/en/stable/testing.html),
anyio conflicts with pytest-asyncio auto mode; when both plugins are
present, set only one to auto.

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
  CancelScope) out of the box; use the anyio pytest plugin (Step 9) instead.
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
- [`pytest-tests`](../pytest-tests/SKILL.md) - full pytest framework (fixtures, parametrize, coverage, CI)
