import httpx


class HttpError(Exception):
    def __init__(self, status):
        super().__init__(f"http {status}")
        self.status = status


class HttpClient:
    def __init__(self, base_url):
        self._client = httpx.AsyncClient(base_url=base_url, timeout=10.0)

    async def get_json(self, path):
        response = await self._client.get(path)
        if response.status_code >= 400:
            raise HttpError(response.status_code)
        return response.json()

    async def aclose(self):
        await self._client.aclose()
