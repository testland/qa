import re

from hypothesis import given, strategies as st

import src.csvio as csvio
from src.csvio import (
    amount_line,
    decode_field,
    encode_field,
    format_amount,
    normalise_currency,
)

DECIMAL = re.compile(r"-?\d+\.\d\d")


@given(st.text())
def test_field_escape_round_trip(value):
    assert decode_field(encode_field(value)) == value


@given(st.lists(st.floats(min_value=-1_000_000, max_value=1_000_000), min_size=1, max_size=20))
def test_amount_cells_are_decimal(amounts):
    for cell in amount_line(amounts).split(","):
        assert DECIMAL.fullmatch(cell)


@given(st.sampled_from(csvio.ISO_4217))
def test_currency_cell_normalised(code):
    assert normalise_currency(code.lower()) == code


@given(st.integers(min_value=0, max_value=100_000).map(lambda cents: cents / 100))
def test_amount_round_trip(x):
    assert float(format_amount(x)) == x
