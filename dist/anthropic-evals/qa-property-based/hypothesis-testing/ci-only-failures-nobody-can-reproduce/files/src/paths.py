"""Asset path helpers. The CDN manifest is keyed by normalised path."""


def normalise(p: str) -> str:
    while "//" in p:
        p = p.replace("//", "/")
    p = p.replace("/./", "/")
    if p.startswith("./"):
        p = p[2:]
    return p.rstrip("/") or "/"


def join(base: str, rel: str) -> str:
    return normalise(f"{base}/{rel}")
