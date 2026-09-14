"""Reference data for the nightly comparison."""

from pathlib import Path

import pandas as pd

SNAPSHOT_DIR = Path("monitoring/baselines")
WINDOW_DAYS = 28


def load(name: str) -> pd.DataFrame:
    files = sorted(SNAPSHOT_DIR.glob(name + "-*.parquet"))[-WINDOW_DAYS:]
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)


def archive(df: pd.DataFrame, name: str, day) -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(SNAPSHOT_DIR / (name + "-" + day.isoformat() + ".parquet"))
