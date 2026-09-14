from hypothesis import given, settings, strategies as st

from src.auth.passwords import hash_password, verify_password


@settings(max_examples=4500, deadline=None)
@given(st.text(min_size=8, max_size=64))
def test_hash_password_verifies(password):
    encoded = hash_password(password)
    assert verify_password(password, encoded) is True
