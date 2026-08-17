# Cannot share a connected client between these tests

## Problem Description

`tests/test_feed.py` is the oldest test module we have. Each test is a plain
function that builds a coroutine and drives it to completion itself, and every
one of them repeats the same four lines of connect/close boilerplate.

We tried to lift that boilerplate into a fixture that hands each test an already
connected `FeedClient`. Every arrangement we tried failed. Building the client in
the fixture and handing it over gives us `RuntimeError: Event loop is closed` on
first use inside the test; driving the fixture's setup to completion separately
gives us `got Future attached to a different loop`. The setup and the test body
each end up with their own short-lived loop, and objects made in one are useless
in the other.

The three assertions themselves are fine and should survive. We also owe this
module a case for the timeout path: `latest()` takes an artificial delay, and a
caller that gives up after 50 ms while the delay is 500 ms should see a timeout
rather than a result.

The suite is green today, so whatever you change has to leave it green.

## Output Specification

1. Rewrite `tests/test_feed.py` so the three existing behaviours are covered by
   tests that the test framework itself runs to completion - no test drives its
   own coroutine.
2. Introduce one fixture that yields a connected `FeedClient` and closes it
   afterwards; all four tests use it.
3. Add the timeout case described above.
4. Update `requirements-dev.txt` and `pyproject.toml` as needed. Name any
   package you add and why.
5. `app/feed.py` must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "feedclient"
version = "0.7.2"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: requirements-dev.txt ===============
pytest==8.3.5

=============== FILE: app/feed.py ===============
import asyncio


class FeedClient:
    def __init__(self, source):
        self._source = source
        self._lock = asyncio.Lock()
        self.calls = 0
        self.closed = False

    async def connect(self):
        await asyncio.sleep(0)
        return self

    async def latest(self, topic, delay=0.0):
        async with self._lock:
            self.calls += 1
            await asyncio.sleep(delay)
            return {"topic": topic, "source": self._source, "seq": self.calls}

    async def close(self):
        self.closed = True

=============== FILE: tests/test_feed.py ===============
import asyncio

from app.feed import FeedClient


def test_latest_returns_topic():
    async def scenario():
        client = await FeedClient("primary").connect()
        try:
            return await client.latest("prices")
        finally:
            await client.close()

    result = asyncio.run(scenario())
    assert result["topic"] == "prices"


def test_latest_tags_the_source():
    async def scenario():
        client = await FeedClient("primary").connect()
        try:
            return await client.latest("trades")
        finally:
            await client.close()

    result = asyncio.run(scenario())
    assert result["source"] == "primary"


def test_sequence_increments_per_call():
    loop = asyncio.new_event_loop()

    async def scenario():
        client = await FeedClient("primary").connect()
        try:
            await client.latest("prices")
            return await client.latest("prices")
        finally:
            await client.close()

    try:
        result = loop.run_until_complete(scenario())
    finally:
        loop.close()
    assert result["seq"] == 2
