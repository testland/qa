# Async framework client patterns

Deeper framework-specific async test patterns. The SKILL.md spine keeps the
minimal FastAPI `AsyncClient` example; FastAPI lifespan events, aiohttp, and
anyio live here.

## FastAPI lifespan events (asgi-lifespan)

`AsyncClient` does not fire lifespan events by default (per
[fastapi.tiangolo.com/advanced/async-tests](https://fastapi.tiangolo.com/advanced/async-tests/)).
To trigger `startup`/`shutdown` handlers, use `asgi-lifespan`:

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

## aiohttp apps (pytest-aiohttp)

Per [docs.aiohttp.org/testing](https://docs.aiohttp.org/en/stable/testing.html),
the `pytest-aiohttp` plugin provides an `aiohttp_client` fixture that manages
server startup and teardown:

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

`aiohttp_client` returns a `TestClient` that starts the server on a random
port and shuts it down after the test.

## anyio as an alternative

Per [anyio.readthedocs.io/testing](https://anyio.readthedocs.io/en/stable/testing.html),
`anyio` ships its own pytest plugin that runs async tests on both asyncio and
Trio backends. Use it when the codebase is written against `anyio` primitives
or when multi-backend verification is needed.

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

anyio conflicts with pytest-asyncio auto mode; when both plugins are present,
set only one to auto.
