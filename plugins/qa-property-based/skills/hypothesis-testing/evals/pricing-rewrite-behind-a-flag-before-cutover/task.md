# The file that is supposed to prove the pricing rewrite is safe is green

## Problem Description

We are replacing `pricing_v1` with `pricing_v2` behind the `pricing_v2` flag:
4% of accounts on 2026-09-25, the rest over the two weeks after that.

@sofia wrote the replacement, and she also wrote the file that is supposed to
prove it is safe, `tests/test_pricing_equivalence.py`. It is green. That is what
is bothering me. It was green the first time she ran it, and the same person
wrote both sides of it. The twenty examples in `tests/test_pricing_v1.py` are
no better as evidence: v2 was written against them, so of course it passes them.

What I wanted out of that file was the two implementations run side by side on
inputs nobody chose by hand, so that if they disagree anywhere I find out now
rather than from a customer's invoice. Go through what she has written and tell
me which of it is evidence and which of it only looks like evidence. Rewrite the
parts that are not, and say what you took out and why.

`src/pricing_v1.py` is frozen for the cutover - finance signed off on its output
and I am not touching the thing I am comparing against. `src/pricing_v2.py` is
still ours to change if the comparison shows it is wrong. Neither module's input
validation is up for discussion: it is identical in both and it is deliberate.

A straight go or no-go for the 25th at the end, please.

## Output Specification

1. Rewrite `tests/test_pricing_equivalence.py`.
2. Do not edit `tests/test_pricing_v1.py` and do not edit `src/pricing_v1.py`.
3. `src/pricing_v2.py` may be changed if the comparison shows it is wrong.
4. Write `docs/pricing-cutover-notes.md` with a verdict on each check in that
   file, any disagreement you found written out as the exact inputs and the two
   outputs, and a go / no-go for 2026-09-25.

## Input Files

Extract the following files before beginning.

=============== FILE: src/pricing_v1.py ===============
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

=============== FILE: src/pricing_v2.py ===============
"""Replacement engine. Behind the `pricing_v2` flag."""

import random
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

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
    gross = Decimal(unit_cents * qty)
    net = gross * (Decimal(100 - discount_pct) / Decimal(100))
    return int(net.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def invoice_number(account_id: int) -> str:
    stamp = datetime.now().strftime("%Y%m%d")
    suffix = random.randint(1000, 9999)
    return f"INV-{stamp}-{account_id:06d}-{suffix}"


def currency_minor_units(currency: str) -> int:
    if currency not in CURRENCIES:
        raise ValueError("unsupported currency")
    return 2

=============== FILE: tests/test_pricing_equivalence.py ===============
from datetime import datetime
from unittest.mock import patch

import pytest
from hypothesis import assume, given, strategies as st

import src.pricing_v1 as v1
import src.pricing_v2 as v2


@given(st.integers(), st.integers(), st.integers())
def test_line_total_agrees(unit_cents, qty, discount_pct):
    try:
        a = v1.line_total(unit_cents, qty, discount_pct)
        b = v2.line_total(unit_cents, qty, discount_pct)
    except ValueError:
        return
    # v1 is float, v2 is Decimal; a cent of drift between the two is expected
    assert abs(a - b) <= 1


@given(st.integers(min_value=1, max_value=999_999))
def test_invoice_number_agrees(account_id):
    frozen = datetime(2026, 9, 25, 11, 30)
    with patch.object(v1, "datetime") as dt1, patch.object(v2, "datetime") as dt2, patch.object(
        v1, "random"
    ) as rnd1, patch.object(v2, "random") as rnd2:
        dt1.now.return_value = frozen
        dt2.now.return_value = frozen
        rnd1.randint.return_value = 4242
        rnd2.randint.return_value = 4242
        assert v1.invoice_number(account_id) == v2.invoice_number(account_id)


@given(st.sampled_from(v1.CURRENCIES))
def test_currency_minor_units_agrees(code):
    assert v1.currency_minor_units(code) == v2.currency_minor_units(code)


@given(st.integers(), st.integers(), st.integers())
def test_both_reject_the_same_out_of_domain_input(unit_cents, qty, discount_pct):
    assume(not (1 <= unit_cents <= 10_000_000 and 1 <= qty <= 999 and 0 <= discount_pct <= 90))
    with pytest.raises(ValueError):
        v1.line_total(unit_cents, qty, discount_pct)
    with pytest.raises(ValueError):
        v2.line_total(unit_cents, qty, discount_pct)

=============== FILE: tests/test_pricing_v1.py ===============
import pytest

from src.pricing_v1 import CURRENCIES, currency_minor_units, line_total


@pytest.mark.parametrize(
    "unit_cents,qty,discount_pct,expected",
    [
        (1000, 1, 0, 1000),
        (1000, 3, 0, 3000),
        (1000, 1, 10, 900),
        (1000, 2, 25, 1500),
        (999, 7, 90, 699),
        (10_000_000, 999, 0, 9_990_000_000),
        (250, 4, 50, 500),
        (1, 999, 0, 999),
    ],
)
def test_line_total_examples(unit_cents, qty, discount_pct, expected):
    assert line_total(unit_cents, qty, discount_pct) == expected


@pytest.mark.parametrize("currency", CURRENCIES)
def test_currency_minor_units_examples(currency):
    assert currency_minor_units(currency) == 2


@pytest.mark.parametrize(
    "unit_cents,qty,discount_pct",
    [(0, 1, 0), (1, 0, 0), (1, 1, 91), (-5, 1, 0), (1, 1000, 0)],
)
def test_line_total_rejects_out_of_domain(unit_cents, qty, discount_pct):
    with pytest.raises(ValueError):
        line_total(unit_cents, qty, discount_pct)


def test_currency_minor_units_rejects_unknown():
    with pytest.raises(ValueError):
        currency_minor_units("XYZ")

=============== FILE: ci/equivalence-run.txt ===============
$ pytest tests/
============================= test session starts ==============================
collected 24 items

tests/test_pricing_equivalence.py ....                                   [ 16%]
tests/test_pricing_v1.py ....................                            [100%]

============================== 24 passed in 4.10s ==============================

commit 3f9d02c - @sofia, "equivalence checks for the v2 cutover"

=============== FILE: requirements-dev.txt ===============
hypothesis==6.112.1
pytest==8.3.3
