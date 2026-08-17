import pytest

from app.pool import validate_dsn


def test_dsn_requires_scheme():
    with pytest.raises(ValueError):
        validate_dsn("localhost/test")


def test_dsn_is_returned_unchanged():
    assert validate_dsn("kv://localhost/test") == "kv://localhost/test"
