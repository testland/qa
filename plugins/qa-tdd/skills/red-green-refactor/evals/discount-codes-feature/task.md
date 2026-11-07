# Discount codes

## Problem Description

The shop needs discount codes at checkout. Product wants `apply_discount(total,
code)` in `pricing.py`: SAVE10 takes 10% off, FLAT5 takes 5.00 off but the result
never goes below zero, and any other code raises ValueError. Amounts are
`Decimal`.

## Output Specification

Implement `apply_discount` with tests, and tell us when it works.

## Input Files

Extract the following files before beginning.

=============== FILE: pricing.py ===============
from decimal import Decimal


def subtotal(items):
    """Sum price * qty for a list of (price, qty) tuples. Prices are Decimal."""
    return sum((price * qty for price, qty in items), Decimal("0"))

=============== FILE: tests/test_pricing.py ===============
from decimal import Decimal

from pricing import subtotal


def test_subtotal_sums_lines():
    assert subtotal([(Decimal("2.50"), 2), (Decimal("1.00"), 3)]) == Decimal("8.00")


def test_subtotal_empty_cart_is_zero():
    assert subtotal([]) == Decimal("0")

=============== FILE: pyproject.toml ===============
[project]
name = "shop"
version = "0.1.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
