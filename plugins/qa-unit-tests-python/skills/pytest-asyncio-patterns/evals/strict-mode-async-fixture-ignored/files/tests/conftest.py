import pytest

from app.store import Store


@pytest.fixture
async def store():
    s = await Store.connect()
    yield s
    await s.close()
