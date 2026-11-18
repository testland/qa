import asyncio
from app.auth import TokenProvider


class FakeClient:
    def __init__(self):
        self.calls = 0

    async def fetch_token(self):
        self.calls += 1
        return {"access_token": f"t{self.calls}", "expires_in": 3600}


def test_fetches_once_under_concurrency():
    client = FakeClient()
    provider = TokenProvider(client)

    async def main():
        return await asyncio.gather(*(provider.get() for _ in range(20)))

    tokens = asyncio.run(main())
    assert client.calls == 1
    assert set(tokens) == {"t1"}
