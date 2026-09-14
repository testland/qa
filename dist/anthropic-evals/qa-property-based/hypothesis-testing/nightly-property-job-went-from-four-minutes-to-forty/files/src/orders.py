from decimal import Decimal


def order_total(lines: list[tuple[int, int]]) -> int:
    total = Decimal(0)
    for qty, unit_cents in lines:
        total += Decimal(qty) * Decimal(unit_cents)
    return int(total)
