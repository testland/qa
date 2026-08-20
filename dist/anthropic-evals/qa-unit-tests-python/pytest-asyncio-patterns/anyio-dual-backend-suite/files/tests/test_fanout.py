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
