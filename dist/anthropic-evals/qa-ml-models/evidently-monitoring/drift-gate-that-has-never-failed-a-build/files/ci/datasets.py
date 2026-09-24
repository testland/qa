"""The two datasets the release gate compares."""

from pathlib import Path

import pandas as pd

DATA_DIR = Path("data")


def reference_dataset() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "train_sample.parquet")


def current_dataset() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "candidate_eval.parquet")
