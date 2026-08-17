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
