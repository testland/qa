# Make the chat server work with websockets 15

## Problem Description

Make `chat/server.py` and `tests/test_chat.py` work with websockets 15 (`notes.md`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: chat/server.py ===============
import http

import websockets

ROOMS = {}


async def health_check(path, request_headers):
    if path == "/healthz":
        return http.HTTPStatus.OK, [], b"OK\n"


async def handler(websocket, path):
    room = path.strip("/") or "lobby"
    ROOMS.setdefault(room, set()).add(websocket)
    try:
        async for message in websocket:
            websockets.broadcast(ROOMS[room], message)
    finally:
        ROOMS[room].discard(websocket)


def serve(port):
    return websockets.serve(handler, "127.0.0.1", port, process_request=health_check)

=============== FILE: tests/test_chat.py ===============
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

=============== FILE: notes.md ===============
After upgrading websockets from 12.0 to 15.0:
- TypeError: handler() missing 1 required positional argument: 'path'
- TypeError: ... got an unexpected keyword argument 'extra_headers'
- /healthz returns an error instead of OK.
- With pytest-xdist the tests fail with "address already in use".
