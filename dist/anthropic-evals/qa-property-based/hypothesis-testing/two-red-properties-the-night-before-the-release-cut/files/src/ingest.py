"""Per-shard ingest. Writes one frame per minute onto the shard wire link."""

from src.rollup import pack


def sample_rate(hits: int, seconds: int) -> float:
    return hits / seconds if seconds else float("nan")


def shard_frame(counters: list[tuple[int, int]]) -> str:
    return pack([sample_rate(hits, seconds) for hits, seconds in counters])
