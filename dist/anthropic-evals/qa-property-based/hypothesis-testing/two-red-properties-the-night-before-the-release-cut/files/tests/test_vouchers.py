from hypothesis import assume, given, settings, strategies as st

from src.checkout import apply_voucher
from src.receipts import sign, verify
from src.vouchers import canonical, is_code, voucher_cents


def test_examples():
    assert is_code("ABCD-0100")
    assert canonical(" abcd-0100 ") == "ABCD-0100"
    assert voucher_cents("ABCD-0100") == 500


@given(st.text(alphabet="ABCDXY-0123456789 ", min_size=1, max_size=18))
def test_canonical_is_idempotent(s):
    assert canonical(canonical(s)) == canonical(s)


@given(st.text(max_size=16))
def test_price_is_a_known_tier(s):
    assume(is_code(s))
    assert 0 < voucher_cents(s) <= 2500


@settings(max_examples=50)
@given(st.binary(min_size=1, max_size=64))
def test_sign_round_trip(payload):
    assert verify(payload, sign(payload)) is True


@given(
    st.integers(min_value=0, max_value=5_000_000),
    st.from_regex(r"[ABC][A-Z]{3}-[0-9]{4}", fullmatch=True),
)
def test_apply_voucher_never_negative(total_cents, code):
    assert apply_voucher(total_cents, code) >= 0
