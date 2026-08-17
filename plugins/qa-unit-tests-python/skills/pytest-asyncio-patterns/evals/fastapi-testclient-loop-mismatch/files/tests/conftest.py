import pytest_asyncio

from app.main import inventory


@pytest_asyncio.fixture
async def seeded_inventory():
    await inventory.put("abc-1", 4)
    yield inventory
    await inventory.clear()
