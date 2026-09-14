"""Sample rollup shared by the ingest path and the on-call dashboard."""


def pack(samples: list[float]) -> str:
    return ";".join(repr(s) for s in samples)


def unpack(text: str) -> list[float]:
    return [float(p) for p in text.split(";")] if text else []


def percentile(samples: list[float], q: int) -> float:
    ordered = sorted(samples)
    idx = int(round(len(ordered) * q / 100))
    return ordered[idx]


def bucket(value: int, width: int) -> int:
    return (value // width) * width
