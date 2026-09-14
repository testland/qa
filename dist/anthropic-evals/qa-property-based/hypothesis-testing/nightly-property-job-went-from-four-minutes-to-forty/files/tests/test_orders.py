from hypothesis import given, settings, strategies as st

from src.orders import order_total

LINES = st.lists(
    st.tuples(st.integers(min_value=1, max_value=999), st.integers(min_value=1, max_value=10_000)),
    min_size=1,
    max_size=40,
)


@settings(max_examples=400)
@given(LINES)
def test_total_is_order_independent(lines):
    assert order_total(lines) == order_total(list(reversed(lines)))
