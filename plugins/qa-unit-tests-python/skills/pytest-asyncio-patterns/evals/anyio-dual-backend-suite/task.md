# We ship this library to both async runtimes and only test one

## Problem Description

`app/fanout.py` is a small helper we publish on PyPI. It runs a caller-supplied
fetch function across a set of keys concurrently and gives up as a whole if the
batch overruns a deadline. It is written against the runtime-neutral concurrency
API, so it is supposed to work for users on either of the two supported async
runtimes.

We have never proved that. The suite runs once, on the default runtime, and the
first bug report from a user on the other one would be news to us. A user
already filed an issue asking whether we support it, and the honest answer today
is "probably".

We want every test in `tests/` executed once per runtime, and we want the two
runs distinguishable in the report so a failure names the runtime it happened
on. The runtime-neutral extra is already installed - `requirements-dev.txt`
pulls in both backends.

The timeout path is also untested. `fetch_all` takes a deadline; a batch whose
fetches are slower than the deadline should raise a timeout, and that behaviour
has to hold on both runtimes too.

## Output Specification

1. Deliver a suite in which each test case runs once per runtime, with the
   runtime visible in the test id.
2. Add the timeout case described above.
3. Make whatever configuration and dependency changes this needs, and state
   which ones and why. If something already in the project has to be turned off
   or removed to make this work, say so explicitly and do it.
4. `app/fanout.py` must not change.
5. The three existing behaviours keep their assertions.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "fanout"
version = "0.3.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
anyio[trio]==4.8.0
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/fanout.py ===============
import anyio


async def fetch_all(fetch, keys, timeout=1.0):
    results = {}

    async def one(key):
        results[key] = await fetch(key)

    with anyio.fail_after(timeout):
        async with anyio.create_task_group() as tg:
            for key in keys:
                tg.start_soon(one, key)
    return results

=============== FILE: tests/test_fanout.py ===============
import asyncio

from app.fanout import fetch_all


async def slow_fetch(key):
    await asyncio.sleep(0.01)
    return key.upper()


async def test_all_keys_are_fetched():
    assert await fetch_all(slow_fetch, ["a", "b"]) == {"a": "A", "b": "B"}


async def test_empty_key_list_returns_empty():
    assert await fetch_all(slow_fetch, []) == {}


async def test_results_are_keyed_by_input():
    result = await fetch_all(slow_fetch, ["x"])
    assert list(result) == ["x"]
