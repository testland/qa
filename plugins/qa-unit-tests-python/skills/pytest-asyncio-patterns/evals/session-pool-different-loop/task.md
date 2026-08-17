# Shared pool blows up once we stop rebuilding it per test

## Problem Description

`create_pool` pays a 200 ms handshake. With one pool per test the suite spent
most of its wall time in that handshake, so we widened the fixture to build the
pool once for the whole run.

Now every test that touches the pool errors:

```
RuntimeError: <asyncio.locks.Semaphore object at 0x...> is bound to a
different event loop
```

The sync test in `tests/test_dsn.py` still passes, so it is specific to the
tests that go through the pool. Reverting the fixture back to one pool per test
makes the error go away, but that is the 200 ms per test we were trying to
delete, and we are about to add fifteen more tests to this module.

The pool object itself is not doing anything exotic - it holds a semaphore and a
dict, both created when the pool is built.

## Output Specification

Deliver a green suite in which:

1. The handshake in `create_pool` runs exactly once for the entire test session,
   no matter how many tests use the pool.
2. All three pool tests pass, keeping their current assertions.
3. `tests/test_dsn.py` keeps passing.
4. `app/pool.py` is not modified - the production object is not the problem.

State which files you changed and why each change was needed.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "kvpool"
version = "0.9.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/pool.py ===============
import asyncio

CONNECT_COUNT = 0


def validate_dsn(dsn):
    if not dsn.startswith("kv://"):
        raise ValueError(f"bad dsn: {dsn}")
    return dsn


class Pool:
    def __init__(self):
        self._sem = asyncio.Semaphore(4)
        self._rows = {}
        self.closed = False

    async def execute(self, key, value=None):
        async with self._sem:
            await asyncio.sleep(0)
            if value is None:
                return self._rows.get(key)
            self._rows[key] = value
            return value

    async def close(self):
        self.closed = True


async def create_pool(dsn):
    global CONNECT_COUNT
    validate_dsn(dsn)
    await asyncio.sleep(0.2)
    CONNECT_COUNT += 1
    return Pool()

=============== FILE: tests/conftest.py ===============
import pytest_asyncio

from app.pool import create_pool


@pytest_asyncio.fixture(scope="session")
async def pool():
    p = await create_pool("kv://localhost/test")
    await p.execute("seed", "ok")
    yield p
    await p.close()

=============== FILE: tests/test_pool.py ===============
async def test_seed_row_is_present(pool):
    assert await pool.execute("seed") == "ok"


async def test_write_then_read(pool):
    await pool.execute("a", "1")
    assert await pool.execute("a") == "1"


async def test_missing_key_is_none(pool):
    assert await pool.execute("nope") is None

=============== FILE: tests/test_dsn.py ===============
import pytest

from app.pool import validate_dsn


def test_dsn_requires_scheme():
    with pytest.raises(ValueError):
        validate_dsn("localhost/test")


def test_dsn_is_returned_unchanged():
    assert validate_dsn("kv://localhost/test") == "kv://localhost/test"
