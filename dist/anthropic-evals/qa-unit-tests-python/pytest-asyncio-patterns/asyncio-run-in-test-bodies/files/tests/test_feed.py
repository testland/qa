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
