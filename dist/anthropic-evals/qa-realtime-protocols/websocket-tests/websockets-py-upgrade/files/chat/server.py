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
