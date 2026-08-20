import asyncio

CONNECT_COUNT = 0


def validate_dsn(dsn):
    if not dsn.startswith("kv://"):
        raise ValueError(f"bad dsn: {dsn}")
    return dsn


class Pool:
    def __init__(self):
        self._sem = asyncio.Semaphore(4)
        self._rows = {}
        self.closed = False

    async def execute(self, key, value=None):
        async with self._sem:
            await asyncio.sleep(0)
            if value is None:
                return self._rows.get(key)
            self._rows[key] = value
            return value

    async def close(self):
        self.closed = True


async def create_pool(dsn):
    global CONNECT_COUNT
    validate_dsn(dsn)
    await asyncio.sleep(0.2)
    CONNECT_COUNT += 1
    return Pool()
