"""Frozen for the cutover. Finance signed off on this output."""

import random
from datetime import datetime

CURRENCIES = ("EUR", "GBP", "USD", "CHF", "SEK", "PLN")


def _validate(unit_cents: int, qty: int, discount_pct: int) -> None:
    if not 1 <= unit_cents <= 10_000_000:
        raise ValueError("unit_cents out of range")
    if not 1 <= qty <= 999:
        raise ValueError("qty out of range")
    if not 0 <= discount_pct <= 90:
        raise ValueError("discount_pct out of range")


def line_total(unit_cents: int, qty: int, discount_pct: int) -> int:
    _validate(unit_cents, qty, discount_pct)
    gross = unit_cents * qty
    net = gross * (100 - discount_pct) / 100
    return round(net)


def invoice_number(account_id: int) -> str:
    stamp = datetime.now().strftime("%Y%m%d")
    suffix = random.randint(1000, 9999)
    return f"INV-{stamp}-{account_id:06d}-{suffix}"


def currency_minor_units(currency: str) -> int:
    if currency not in CURRENCIES:
        raise ValueError("unsupported currency")
    return 2
