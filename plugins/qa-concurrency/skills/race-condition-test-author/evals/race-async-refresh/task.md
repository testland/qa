# Requests fail with 401 after the token expires, the test still passes

## Problem Description

After the 09:00 token expiry most requests fail with 401 (`docs/incident.md`), but `tests/test_auth.py` passes. Make the test fail on the current code, then fix `TokenProvider`. pytest is installed (no plugins); run the tests before and after the fix.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/__init__.py ===============
# Package marker.

=============== FILE: app/auth.py ===============
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

=============== FILE: tests/__init__.py ===============
# Package marker.

=============== FILE: tests/test_auth.py ===============
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

=============== FILE: docs/incident.md ===============
Our identity provider revokes the previous access token whenever it issues a new one.
At 09:00, when the token expires, about 40 concurrent requests each refresh it, and most
of them then call the API with a revoked token and get 401. tests/test_auth.py passes.
Last month the identity provider was down for 2 minutes; whatever the fix is, the service
must recover by itself once it is back.
