from hypothesis import assume, given, strategies as st

from src.emails import is_normalised, normalise


@given(st.text())
def test_normalise_keeps_it_valid(addr):
    assume("@" in addr)
    assume(addr.count("@") == 1)
    local, domain = addr.split("@")
    assume(len(local) >= 1)
    assume("." in domain)
    assume(not domain.startswith("."))
    assume(len(domain) >= 4)
    assert is_normalised(normalise(addr))
    assert normalise(normalise(addr)) == normalise(addr)
