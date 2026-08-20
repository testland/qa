import asyncio


class RateStore:
    def __init__(self, table):
        self._table = table

    async def rate(self, code):
        await asyncio.sleep(0)
        if code not in self._table:
            raise LookupError(f"no rate for {code}")
        return self._table[code]


def known_codes(table):
    return sorted(table)


async def convert(store, amount, code):
    rate = await store.rate(code)
    return round(amount * rate, 2)
