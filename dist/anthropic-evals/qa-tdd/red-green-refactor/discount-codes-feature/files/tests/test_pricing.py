from decimal import Decimal

from pricing import subtotal


def test_subtotal_sums_lines():
    assert subtotal([(Decimal("2.50"), 2), (Decimal("1.00"), 3)]) == Decimal("8.00")


def test_subtotal_empty_cart_is_zero():
    assert subtotal([]) == Decimal("0")
