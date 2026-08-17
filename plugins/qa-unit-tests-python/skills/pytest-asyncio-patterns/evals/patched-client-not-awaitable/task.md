# Stand-in for the HTTP client cannot be awaited

## Problem Description

`sync_products` walks a paginated product feed, retries a page once if the
server returns 5xx, gives up on any 4xx, and always closes its client. Only the
pure `dedupe` helper is covered today - see `tests/test_dedupe.py`, which passes.

Every attempt at covering `sync_products` has stalled in the same place. We
substitute `HttpClient` in `app.sync_job`, hand the substitute a payload for the
first page, and the test dies on the first request:

```
TypeError: object MagicMock can't be used in 'await' expression
```

Handing it a pre-built coroutine object instead gets one page through and then
fails on the second with `cannot reuse already awaited coroutine`, which is
worse, because the retry case needs the same request to answer differently the
second time it is made.

We need all three paths covered without a network. Note that these tests run in
a sandbox with no outbound access at all, so an accidental real request does not
fail politely - it hangs until the job times out.

## Output Specification

Add `tests/test_sync_job.py` covering:

1. Two pages return items and the merged, deduplicated result is returned.
2. A 503 on page 2 is retried once, the retry's payload is the one used, and
   page 1 is not re-requested.
3. A 404 on page 1 propagates to the caller, and the client is still closed.

Constraints: no real HTTP, no new packages in `requirements-dev.txt`, and no
changes under `app/`. `tests/test_dedupe.py` must keep passing.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "catalog-sync"
version = "2.4.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
httpx==0.28.1
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/http.py ===============
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

=============== FILE: app/sync_job.py ===============
from app.http import HttpClient, HttpError


def dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item["sku"] in seen:
            continue
        seen.add(item["sku"])
        out.append(item)
    return out


async def sync_products(base_url, pages=2):
    client = HttpClient(base_url)
    merged = []
    try:
        for page in range(1, pages + 1):
            path = f"/products?page={page}"
            try:
                payload = await client.get_json(path)
            except HttpError as exc:
                if exc.status < 500:
                    raise
                payload = await client.get_json(path)
            merged.extend(payload["items"])
    finally:
        await client.aclose()
    return dedupe(merged)

=============== FILE: tests/test_dedupe.py ===============
from app.sync_job import dedupe


def test_dedupe_keeps_the_first_occurrence():
    items = [{"sku": "a", "qty": 1}, {"sku": "a", "qty": 2}, {"sku": "b", "qty": 3}]
    assert dedupe(items) == [{"sku": "a", "qty": 1}, {"sku": "b", "qty": 3}]


def test_dedupe_of_nothing_is_nothing():
    assert dedupe([]) == []
