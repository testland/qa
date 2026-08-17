import asyncio


class FeedClient:
    def __init__(self, source):
        self._source = source
        self._lock = asyncio.Lock()
        self.calls = 0
        self.closed = False

    async def connect(self):
        await asyncio.sleep(0)
        return self

    async def latest(self, topic, delay=0.0):
        async with self._lock:
            self.calls += 1
            await asyncio.sleep(delay)
            return {"topic": topic, "source": self._source, "seq": self.calls}

    async def close(self):
        self.closed = True
