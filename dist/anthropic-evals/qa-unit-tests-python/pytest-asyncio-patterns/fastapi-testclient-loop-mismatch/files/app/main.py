import asyncio

from fastapi import Depends, FastAPI, HTTPException


class Inventory:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._items = {}

    async def put(self, sku, qty):
        async with self._lock:
            self._items[sku] = qty

    async def get(self, sku):
        async with self._lock:
            return self._items.get(sku)

    async def all(self):
        async with self._lock:
            return dict(self._items)

    async def clear(self):
        async with self._lock:
            self._items.clear()


inventory = Inventory()


def get_inventory():
    return inventory


app = FastAPI()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/items")
async def list_items(inv: Inventory = Depends(get_inventory)):
    return await inv.all()


@app.get("/items/{sku}")
async def read_item(sku: str, inv: Inventory = Depends(get_inventory)):
    qty = await inv.get(sku)
    if qty is None:
        raise HTTPException(status_code=404, detail="unknown sku")
    return {"sku": sku, "qty": qty}
