from hypothesis import given, settings, strategies as st

from src.ids import short_id

ALLOWED = set("abcdefghijklmnopqrstuvwxyz0123456789-")


@settings(max_examples=200)
@given(st.integers(min_value=0, max_value=2**48 - 1))
def test_short_id_is_url_safe(n):
    assert set(short_id(n)) <= ALLOWED
