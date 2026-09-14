from datetime import datetime
from unittest.mock import patch

import pytest
from hypothesis import assume, given, settings, strategies as st

import src.pricing_v1 as v1
import src.pricing_v2 as v2

# the five standard bands off the pricing deck
DISCOUNT_BANDS = [0, 20, 40, 60, 80]


@settings(max_examples=500)  # it is a cutover gate, it can have the seconds
@given(
    st.integers(min_value=1, max_value=10_000_000),
    st.integers(min_value=1, max_value=999),
    st.sampled_from(DISCOUNT_BANDS),
)
def test_line_total_agrees(unit_cents, qty, discount_pct):
    assert v1.line_total(unit_cents, qty, discount_pct) == v2.line_total(
        unit_cents, qty, discount_pct
    )


@given(st.integers(min_value=1, max_value=999_999))
def test_invoice_number_agrees(account_id):
    frozen = datetime(2026, 9, 25, 11, 30)
    with patch.object(v1, "datetime") as dt1, patch.object(v2, "datetime") as dt2, patch.object(
        v1, "random"
    ) as rnd1, patch.object(v2, "random") as rnd2:
        dt1.now.return_value = frozen
        dt2.now.return_value = frozen
        rnd1.randint.return_value = 4242
        rnd2.randint.return_value = 4242
        assert v1.invoice_number(account_id) == v2.invoice_number(account_id)


@given(st.sampled_from(v1.CURRENCIES))
def test_currency_minor_units_agrees(code):
    assert v1.currency_minor_units(code) == v2.currency_minor_units(code)


@given(st.integers(), st.integers(), st.integers())
def test_both_reject_the_same_out_of_domain_input(unit_cents, qty, discount_pct):
    assume(not (1 <= unit_cents <= 10_000_000 and 1 <= qty <= 999 and 0 <= discount_pct <= 90))
    with pytest.raises(ValueError):
        v1.line_total(unit_cents, qty, discount_pct)
    with pytest.raises(ValueError):
        v2.line_total(unit_cents, qty, discount_pct)
