import asyncio


class Store:
    def __init__(self):
        self._data = {}
        self._lock = asyncio.Lock()
        self.closed = False

    @classmethod
    async def connect(cls):
        await asyncio.sleep(0)
        return cls()

    async def set(self, key, value):
        async with self._lock:
            self._data[key] = value

    async def get(self, key):
        async with self._lock:
            return self._data.get(key)

    async def close(self):
        self.closed = True
