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
