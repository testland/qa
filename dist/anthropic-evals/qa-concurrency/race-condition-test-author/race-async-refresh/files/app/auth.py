import time


class TokenProvider:
    def __init__(self, client, clock=time.monotonic):
        self._client = client
        self._clock = clock
        self._token = None
        self._expires_at = 0.0

    async def get(self) -> str:
        if self._token is None or self._clock() >= self._expires_at - 30:
            data = await self._client.fetch_token()  # POST /oauth/token
            self._token = data["access_token"]
            self._expires_at = self._clock() + data["expires_in"]
        return self._token
