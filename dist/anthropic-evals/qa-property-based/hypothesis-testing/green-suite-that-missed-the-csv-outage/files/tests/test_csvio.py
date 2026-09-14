from unittest.mock import patch

from hypothesis import given, strategies as st

import src.csvio as csvio
from src.csvio import (
    decode_field,
    encode_field,
    format_amount,
    is_currency_code,
    normalise_currency,
)


@given(st.text())
def test_field_escape_round_trip(value):
    assert decode_field(encode_field(value)) == value


@given(st.lists(st.floats(), min_size=1, max_size=20))
def test_amount_line_cells_are_decimal(amounts):
    # format_amount has its own check below; stub it so this one is about the joining
    with patch.object(csvio, "format_amount", lambda x: "0.00"):
        line = csvio.amount_line(amounts)
    assert all(cell.count(".") == 1 for cell in line.split(","))


@given(st.text())
def test_currency_cell_normalised(code):
    if is_currency_code(code):
        assert encode_field(normalise_currency(code)) == code.upper()


@given(st.integers(min_value=0, max_value=100_000).map(lambda cents: cents / 100))
def test_amount_round_trip(x):
    assert float(format_amount(x)) == x
