import asyncio

import aiohttp
import pytest
from aiohttp import web

from app.service import create_app

pytestmark = pytest.mark.asyncio

BASE = "http://127.0.0.1:8080"


async def start_server():
    runner = web.AppRunner(create_app())
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 8080)
    await site.start()
    await asyncio.sleep(0.5)
    return runner


async def test_health_is_ok():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE}/health") as resp:
                assert resp.status == 200
                assert await resp.json() == {"status": "ok"}
    finally:
        await runner.cleanup()


async def test_put_item_returns_created():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE}/items/bolt", json={"qty": 5}) as resp:
                assert resp.status == 201
                assert await resp.json() == {"name": "bolt", "qty": 5}
    finally:
        await runner.cleanup()


async def test_stored_item_is_readable():
    runner = await start_server()
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{BASE}/items/nut", json={"qty": 2})
            async with session.get(f"{BASE}/items/nut") as resp:
                assert resp.status == 200
                assert await resp.json() == {"name": "nut", "qty": 2}
    finally:
        await runner.cleanup()
