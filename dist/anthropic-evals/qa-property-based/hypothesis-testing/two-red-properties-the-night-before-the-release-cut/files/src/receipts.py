"""Receipt signing. Round count fixed by the PCI review, 2026-02."""

import hashlib
import hmac

KEY = b"receipt-signing-key"
ROUNDS = 220_000


def sign(payload: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", payload, KEY, ROUNDS).hex()


def verify(payload: bytes, signature: str) -> bool:
    return hmac.compare_digest(sign(payload), signature)
