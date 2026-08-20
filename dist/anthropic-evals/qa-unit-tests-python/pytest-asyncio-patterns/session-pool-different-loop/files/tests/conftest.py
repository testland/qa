import pytest_asyncio

from app.pool import create_pool


@pytest_asyncio.fixture(scope="session")
async def pool():
    p = await create_pool("kv://localhost/test")
    await p.execute("seed", "ok")
    yield p
    await p.close()
