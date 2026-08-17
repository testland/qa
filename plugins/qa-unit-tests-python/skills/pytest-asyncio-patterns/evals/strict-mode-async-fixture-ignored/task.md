# Shared setup fixture hands the test an async_generator

## Problem Description

Our key-value store wrapper has three tests. The first one builds its store
inline and passes. The other two take the `store` fixture we added last week so
the connect/close dance lives in one place, and both die immediately:

```
AttributeError: 'async_generator' object has no attribute 'set'
```

The fixture body is right - if you copy its two lines into a test they work. The
value that reaches the test is not the object the fixture yields, it is the
generator itself, so nothing on it is callable.

We do not want to give up and paste the connect/close pair back into every test;
that is exactly what the fixture was introduced to remove. Two more test modules
are queued behind this one and they all need the same shared setup.

## Output Specification

Deliver a suite where all three tests pass and the two fixture-using tests still
get their store from a single shared fixture.

1. `tests/test_store.py` keeps the same three test functions and the same
   assertions.
2. The store is still connected once per test and closed afterwards, from one
   place - not duplicated per test.
3. `app/store.py` must not change; the production class is fine.
4. No new third-party packages beyond what `requirements-dev.txt` already lists.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "kv-store"
version = "0.4.1"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: requirements-dev.txt ===============
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/store.py ===============
import asyncio


class Store:
    def __init__(self):
        self._data = {}
        self._lock = asyncio.Lock()
        self.closed = False

    @classmethod
    async def connect(cls):
        await asyncio.sleep(0)
        return cls()

    async def set(self, key, value):
        async with self._lock:
            self._data[key] = value

    async def get(self, key):
        async with self._lock:
            return self._data.get(key)

    async def close(self):
        self.closed = True

=============== FILE: tests/conftest.py ===============
import pytest

from app.store import Store


@pytest.fixture
async def store():
    s = await Store.connect()
    yield s
    await s.close()

=============== FILE: tests/test_store.py ===============
import pytest

from app.store import Store

pytestmark = pytest.mark.asyncio


async def test_connect_returns_open_store():
    s = await Store.connect()
    assert s.closed is False


async def test_set_then_get(store):
    await store.set("a", 1)
    assert await store.get("a") == 1


async def test_missing_key_is_none(store):
    assert await store.get("nope") is None
