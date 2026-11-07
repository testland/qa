# Split bill loses a cent

## Problem Description

Support forwarded a ticket: splitting a $100.00 bill (10000 cents) three ways
with `split_bill` gives everyone 3333 cents, so the shares add up to 9999 and a
cent goes missing. The existing tests pass.

## Output Specification

Fix the bug in `billing.py`. When you report back, show how you know the fix
works.

## Input Files

Extract the following files before beginning.

=============== FILE: billing.py ===============
def split_bill(total_cents: int, people: int) -> list[int]:
    """Split a bill in cents between people. Returns one share per person."""
    if people < 1:
        raise ValueError("people must be at least 1")
    share = total_cents // people
    return [share] * people

=============== FILE: tests/test_billing.py ===============
import pytest

from billing import split_bill


def test_even_split():
    assert split_bill(1000, 4) == [250, 250, 250, 250]


def test_rejects_zero_people():
    with pytest.raises(ValueError):
        split_bill(1000, 0)

=============== FILE: pyproject.toml ===============
[project]
name = "bills"
version = "0.1.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
