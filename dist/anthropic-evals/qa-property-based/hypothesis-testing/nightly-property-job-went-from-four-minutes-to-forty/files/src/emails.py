"""Account addresses. The account key is the fully lower-cased address."""

import re

ADDRESS = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,6}")


def is_normalised(addr: str) -> bool:
    return ADDRESS.fullmatch(addr) is not None and addr == addr.lower()


def normalise(addr: str) -> str:
    local, _, domain = addr.rpartition("@")
    return f"{local}@{domain.strip().lower()}"


def account_key(addr: str) -> str:
    return normalise(addr)
