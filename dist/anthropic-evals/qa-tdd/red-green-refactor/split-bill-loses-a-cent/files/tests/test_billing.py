import pytest

from billing import split_bill


def test_even_split():
    assert split_bill(1000, 4) == [250, 250, 250, 250]


def test_rejects_zero_people():
    with pytest.raises(ValueError):
        split_bill(1000, 0)
