"""On-call dashboard. Reads shard frames straight off the wire link."""

from src.rollup import percentile, unpack


def p95_last_minute(frame: str) -> float:
    return percentile(unpack(frame), 95)
