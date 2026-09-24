"""House-rule check. Branch `feat/house-rules`, M. Fuentes, 2026-09-09."""

RIVALS = ["Helpwise", "Tickety", "Sortiv"]
DISCOUNT_WORDS = ["discount", "coupon", "voucher", "promo code"]


def check(response: str) -> bool:
    low = response.lower()
    if any(r.lower() in low for r in RIVALS):
        return False
    if any(w in low for w in DISCOUNT_WORDS):
        return False
    return True


def score(rows):
    passed = sum(1 for r in rows if check(r["response"]))
    return passed / len(rows)
