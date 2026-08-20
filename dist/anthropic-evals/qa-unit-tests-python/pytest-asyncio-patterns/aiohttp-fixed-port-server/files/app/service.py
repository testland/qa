from aiohttp import web

ITEMS = web.AppKey("items", dict)


async def health(request):
    return web.json_response({"status": "ok"})


async def read_item(request):
    name = request.match_info["name"]
    items = request.app[ITEMS]
    if name not in items:
        raise web.HTTPNotFound(reason="unknown item")
    return web.json_response({"name": name, "qty": items[name]})


async def put_item(request):
    name = request.match_info["name"]
    body = await request.json()
    request.app[ITEMS][name] = body["qty"]
    return web.json_response({"name": name, "qty": body["qty"]}, status=201)


def create_app():
    app = web.Application()
    app[ITEMS] = {}
    app.router.add_get("/health", health)
    app.router.add_get("/items/{name}", read_item)
    app.router.add_post("/items/{name}", put_item)
    return app
