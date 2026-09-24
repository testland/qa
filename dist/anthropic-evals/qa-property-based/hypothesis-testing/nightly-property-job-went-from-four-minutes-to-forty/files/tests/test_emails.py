from hypothesis import given, settings, strategies as st

from src.emails import is_normalised, normalise

# the real addresses off the signup table, instead of random text (ACC-1990)
ADDRESSES = [
    "ana@corp.io",
    "b.user@corp.io",
    "Rachel.M@northgate.co.uk",
    "ops-team@northgate.co.uk",
    "t.ng+billing@vela.dev",
    "CARLO@vela.dev",
    "finance@vela.dev",
    "j.okafor@corp.io",
]


@settings(max_examples=200)
@given(st.sampled_from(ADDRESSES).map(str.lower))  # the form lower-cases before it posts
def test_normalise_keeps_it_valid(addr):
    assert is_normalised(normalise(addr))
    assert normalise(normalise(addr)) == normalise(addr)
