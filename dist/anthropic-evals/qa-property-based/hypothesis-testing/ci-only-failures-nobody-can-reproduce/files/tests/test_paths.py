from hypothesis import given, strategies as st

from src.paths import join, normalise

SEGMENT_CHARS = "abcxy./-"


def test_normalise_examples():
    assert normalise("assets//img/") == "assets/img"
    assert normalise("./assets/./img") == "assets/img"
    assert normalise("/") == "/"


def test_join_examples():
    assert join("assets", "img/logo.svg") == "assets/img/logo.svg"
    assert join("assets/", "/img") == "assets/img"


@given(st.text(alphabet=SEGMENT_CHARS, min_size=1, max_size=24))
def test_normalise_is_idempotent(p):
    assert normalise(normalise(p)) == normalise(p)


@given(st.text(alphabet=SEGMENT_CHARS, min_size=1, max_size=24))
def test_normalise_has_no_double_slash(p):
    assert "//" not in normalise(p)
