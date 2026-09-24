"""Display helpers."""

from functools import lru_cache

_SYMBOLS = {"USD": "$", "GBP": "GBP ", "EUR": "EUR ", "JPY": "JPY "}


@lru_cache(maxsize=None)
def currency_symbol(code):
    return _SYMBOLS[code]
