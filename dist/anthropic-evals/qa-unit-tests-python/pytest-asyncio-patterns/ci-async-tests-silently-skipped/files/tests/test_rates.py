import pytest

from app.rates import RateStore, convert, known_codes

TABLE = {"EUR": 1.09, "GBP": 1.27}


def test_known_codes_are_sorted():
    assert known_codes(TABLE) == ["EUR", "GBP"]


async def test_rate_is_returned():
    store = RateStore(TABLE)
    assert await store.rate("EUR") == 1.09


async def test_unknown_code_raises():
    store = RateStore(TABLE)
    with pytest.raises(LookupError):
        await store.rate("JPY")


async def test_convert_rounds_to_cents():
    store = RateStore(TABLE)
    assert await convert(store, 10, "GBP") == 12.7
