from hypothesis import given, strategies as st

from src.rollup import bucket, pack, percentile, unpack


def test_pack_examples():
    assert pack([1.5, 2.0]) == "1.5;2.0"
    assert unpack("1.5;2.0") == [1.5, 2.0]


def test_percentile_examples():
    assert percentile([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0], 95) == 12.0
    assert percentile([5.0, 1.0, 9.0, 3.0, 7.0, 2.0, 8.0, 4.0, 6.0, 10.0, 11.0], 50) == 7.0


@given(st.lists(st.floats(), min_size=1, max_size=50))
def test_pack_round_trip(samples):
    assert unpack(pack(samples)) == samples


@given(st.lists(st.floats(allow_nan=False, allow_infinity=False), min_size=1, max_size=200))
def test_percentile_is_a_sample(samples):
    assert percentile(samples, 95) in samples


@given(st.integers(), st.integers(min_value=1, max_value=1000))
def test_bucket_is_at_most_value(value, width):
    assert bucket(value, width) <= value
