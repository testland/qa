# Flag endpoints explode under test, work in production

## Problem Description

`app/main.py` loads a feature-flag snapshot when the application starts and
drops it when the application stops. `/flags/{name}` reads that snapshot.

In production this works. Under test, every request to `/flags/...` dies before
returning a response:

```
AttributeError: 'State' object has no attribute 'flags'
```

`tests/test_health.py` passes, and it drives the app exactly the same way, so
the client wiring is not the problem - the endpoint it exercises just does not
need the snapshot. The startup body in `app/main.py` never executes during the
test run. The shutdown body presumably never runs either, and we would like a
test that proves it does, because a leaked snapshot between tests is the next
bug waiting to happen.

Team constraint: this suite is asynchronous end to end and stays that way. We do
not want a thread-backed client in this module - the flag store will be swapped
for a real connection pool next quarter and a second thread with its own loop
will bite us the same week.

You may add packages to `requirements-dev.txt` if the fix needs one; say which
and why.

## Output Specification

Deliver `tests/test_flags.py` covering:

1. `GET /flags/new-checkout` returns `{"name": "new-checkout", "enabled": true}`.
2. `GET /flags/does-not-exist` returns 404.
3. The shutdown half of the application lifecycle runs after the test is done
   with the app - assert it, do not assume it.

`tests/test_health.py` must keep passing, and `app/main.py` must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "flagsvc"
version = "1.5.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

=============== FILE: requirements-dev.txt ===============
fastapi==0.115.6
httpx==0.28.1
pytest==8.3.5
pytest-asyncio==0.25.3

=============== FILE: app/main.py ===============
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request

LOADS = 0
SHUTDOWNS = 0


async def load_flags():
    global LOADS
    await asyncio.sleep(0)
    LOADS += 1
    return {"new-checkout": True, "beta-search": False}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global SHUTDOWNS
    app.state.flags = await load_flags()
    yield
    SHUTDOWNS += 1
    app.state.flags = None


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/flags/{name}")
async def read_flag(name: str, request: Request):
    flags = request.app.state.flags
    if flags is None or name not in flags:
        raise HTTPException(status_code=404, detail="unknown flag")
    return {"name": name, "enabled": flags[name]}

=============== FILE: tests/test_health.py ===============
from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_health_is_ok():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
