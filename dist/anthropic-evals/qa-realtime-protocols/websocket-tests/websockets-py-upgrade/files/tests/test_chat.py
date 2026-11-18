import pytest
import websockets

from chat.server import serve


@pytest.mark.asyncio
async def test_broadcast_in_room():
    async with serve(8765):
        async with websockets.connect("ws://127.0.0.1:8765/room1", extra_headers={"Authorization": "Bearer t"}) as a, \
                   websockets.connect("ws://127.0.0.1:8765/room1") as b:
            await a.send("hi")
            assert await b.recv() == "hi"
