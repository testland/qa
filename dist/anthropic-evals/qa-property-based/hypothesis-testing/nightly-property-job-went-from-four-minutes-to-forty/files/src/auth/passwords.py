import hashlib
import os

ITERATIONS = 600_000  # OWASP baseline for PBKDF2-HMAC-SHA256; signed off 2026-04


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    _, iters, salt_hex, dk_hex = encoded.split("$")
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
    )
    return dk.hex() == dk_hex
