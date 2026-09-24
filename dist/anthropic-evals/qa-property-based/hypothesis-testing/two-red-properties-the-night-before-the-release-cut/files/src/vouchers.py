"""Promotion vouchers. The first letter is the tier; the digits are the serial."""

import re

CODE = re.compile(r"[A-Z]{4}-[0-9]{4}")

TIER_CENTS = {"A": 500, "B": 1000, "C": 2500}


class VoucherError(ValueError):
    """Raised when a voucher code cannot be priced."""


def is_code(s: str) -> bool:
    return CODE.fullmatch(s) is not None


def canonical(s: str) -> str:
    return s.strip().upper()


def voucher_cents(code: str) -> int:
    return TIER_CENTS[code[0]]
