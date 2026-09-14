"""Baseline snapshots the nightly jobs compare against."""

from pathlib import Path

import pandas as pd

SNAPSHOT_DIR = Path("monitoring/baselines")


def load(name: str) -> pd.DataFrame:
    return pd.read_parquet(SNAPSHOT_DIR / (name + ".parquet"))


def refresh(df: pd.DataFrame, name: str) -> None:
    """Write df over the named snapshot."""
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(SNAPSHOT_DIR / (name + ".parquet"))
