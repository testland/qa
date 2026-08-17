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
