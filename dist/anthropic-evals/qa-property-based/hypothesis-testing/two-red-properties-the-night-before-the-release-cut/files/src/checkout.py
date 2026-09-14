"""Basket totals. A code we cannot price is treated as no voucher at all."""

from src.vouchers import VoucherError, canonical, is_code, voucher_cents


def apply_voucher(total_cents: int, code: str) -> int:
    c = canonical(code)
    if not is_code(c):
        return total_cents
    try:
        return max(0, total_cents - voucher_cents(c))
    except VoucherError:
        return total_cents
