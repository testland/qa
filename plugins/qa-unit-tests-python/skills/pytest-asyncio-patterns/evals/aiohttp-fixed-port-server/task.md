# Our aiohttp tests fight over port 8080

## Problem Description

Every test in `tests/test_service.py` stands the app up on 127.0.0.1:8080, waits
half a second for it to come up, then talks to it with a real client session.

That worked when one person ran the suite on one machine. Now:

- Two CI jobs land on the same runner and the second one dies with
  `OSError: [Errno 98] Address already in use`.
- Anyone with the app running locally cannot run the tests at all.
- If a test fails between `site.start()` and `runner.cleanup()`, the port stays
  held until the process exits and the rest of the file fails too.
- Three tests times half a second of sleeping is most of the suite's runtime,
  and we are adding more.

`pytest-aiohttp` is already in `requirements-dev.txt` - someone added it during
an earlier attempt at this and it is currently unused.

## Output Specification

Rewrite `tests/test_service.py` so that:

1. No fixed port appears anywhere in the tests, and two copies of the suite can
   run concurrently on one machine.
2. Server startup and shutdown are not hand-rolled per test, and a failing
   assertion cannot leak a running server into the next test.
3. The fixed sleep is gone; nothing waits on a timer for the server to be ready.
4. The three existing behaviours keep their assertions, and a fourth case is
   added for `GET /items/{name}` on a name that was never stored (404).

`app/service.py` must not change. Update `pyproject.toml` if the way the tests
are run requires it.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "itemsvc"
version = "2.1.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "strict"

=============== FILE: requirements-dev.txt ===============
aiohttp==3.11.11
pytest==8.3.5
pytest-asyncio==0.25.3
pytest-aiohttp==1.0.5

=============== FILE: app/service.py ===============
from aiohttp import web

ITEMS = web.AppKey("items", dict)


async def health(request):
    return web.json_response({"status": "ok"})


async def read_item(request):
    name = request.match_info["name"]
    items = request.app[ITEMS]
    if name not in items:
        raise web.HTTPNotFound(reason="unknown item")
    return web.json_response({"name": name, "qty": items[name]})


async def put_item(request):
    name = request.match_info["name"]
    body = await request.json()
    request.app[ITEMS][name] = body["qty"]
    return web.json_response({"name": name, "qty": body["qty"]}, status=201)


def create_app():
    app = web.Application()
    app[ITEMS] = {}
    app.router.add_get("/health", health)
    app.router.add_get("/items/{name}", read_item)
    app.router.add_post("/items/{name}", put_item)
    return app

=============== FILE: tests/test_service.py ===============
import asyncio

import aiohttp
import pytest
from aiohttp import web

from app.service import create_app

pytestmark = pytest.mark.asyncio

BASE = "http://127.0.0.1:8080"


async def start_server():
    runner = web.AppRunner(create_app())
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 8080)
    await site.start()
    await asyncio.sleep(0.5)
    return runner


async def test_health_is_ok():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE}/health") as resp:
                assert resp.status == 200
                assert await resp.json() == {"status": "ok"}
    finally:
        await runner.cleanup()


async def test_put_item_returns_created():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE}/items/bolt", json={"qty": 5}) as resp:
                assert resp.status == 201
                assert await resp.json() == {"name": "bolt", "qty": 5}
    finally:
        await runner.cleanup()


async def test_stored_item_is_readable():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{BASE}/items/nut", json={"qty": 2})
            async with session.get(f"{BASE}/items/nut") as resp:
                assert resp.status == 200
                assert await resp.json() == {"name": "nut", "qty": 2}
    finally:
        await runner.cleanup()
