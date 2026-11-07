from decimal import Decimal


def subtotal(items):
    """Sum price * qty for a list of (price, qty) tuples. Prices are Decimal."""
    return sum((price * qty for price, qty in items), Decimal("0"))
