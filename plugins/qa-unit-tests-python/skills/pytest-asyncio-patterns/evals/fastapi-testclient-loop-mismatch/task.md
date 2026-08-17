# Seeded inventory is invisible to the request under test

## Problem Description

The two tests in `tests/test_api.py` pass. Both hit endpoints that need no
pre-existing state.

The test we cannot write is the one that matters: seed a SKU, then assert that
`GET /items/{sku}` returns its quantity. Seeding has to happen through the
inventory object itself, since `put()` is a coroutine, so we wrote
`seeded_inventory` in `conftest.py` and made the test a coroutine to be able to
use it. That test never gets as far as an assertion:

```
RuntimeError: <asyncio.locks.Lock object at 0x7f2b...> is bound to a
different event loop
```

The seeding runs on one loop and the request handler runs on another, so the
lock inside `Inventory` refuses the second one. Sequencing the seeding
differently does not help; the request is simply not executing where the fixture
did.

Two constraints from the team. We are not standing up a real server on a port
for these tests - the whole point of the current setup is that nothing binds a
socket. And `httpx` is pinned at the version in `requirements-dev.txt`; a
dependency bump is a separate conversation with security.

## Output Specification

Deliver `tests/test_api.py` covering:

1. `GET /items/{sku}` returns the seeded quantity for a SKU placed there by the
   `seeded_inventory` fixture.
2. `GET /items/{sku}` returns 404 for a SKU that was never stored.
3. `GET /health` returns `{"status": "ok"}` (already covered - keep it covered).
4. `GET /items` returns an empty object when nothing has been seeded (already
   covered - keep it covered).

Requests must reach the application in-process. Nothing may listen on a port,
and `app/main.py` and `requirements-dev.txt` must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "inventory-api"
version = "3.0.1"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "strict"

=============== FILE: requirements-dev.txt ===============
fastapi==0.115.6
httpx==0.28.1
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/main.py ===============
import asyncio

from fastapi import Depends, FastAPI, HTTPException


class Inventory:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._items = {}

    async def put(self, sku, qty):
        async with self._lock:
            self._items[sku] = qty

    async def get(self, sku):
        async with self._lock:
            return self._items.get(sku)

    async def all(self):
        async with self._lock:
            return dict(self._items)

    async def clear(self):
        async with self._lock:
            self._items.clear()


inventory = Inventory()


def get_inventory():
    return inventory


app = FastAPI()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/items")
async def list_items(inv: Inventory = Depends(get_inventory)):
    return await inv.all()


@app.get("/items/{sku}")
async def read_item(sku: str, inv: Inventory = Depends(get_inventory)):
    qty = await inv.get(sku)
    if qty is None:
        raise HTTPException(status_code=404, detail="unknown sku")
    return {"sku": sku, "qty": qty}

=============== FILE: tests/conftest.py ===============
import pytest_asyncio

from app.main import inventory


@pytest_asyncio.fixture
async def seeded_inventory():
    await inventory.put("abc-1", 4)
    yield inventory
    await inventory.clear()

=============== FILE: tests/test_api.py ===============
from fastapi.testclient import TestClient

from app.main import app


def test_health_is_ok():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_items_is_empty_by_default():
    with TestClient(app) as client:
        response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == {}
