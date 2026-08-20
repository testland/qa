import anyio


async def fetch_all(fetch, keys, timeout=1.0):
    results = {}

    async def one(key):
        results[key] = await fetch(key)

    with anyio.fail_after(timeout):
        async with anyio.create_task_group() as tg:
            for key in keys:
                tg.start_soon(one, key)
    return results
