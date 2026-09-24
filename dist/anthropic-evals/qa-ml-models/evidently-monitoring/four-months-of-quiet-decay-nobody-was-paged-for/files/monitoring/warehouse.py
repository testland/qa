"""Warehouse access for the monitoring jobs."""

import datetime as dt

import pandas as pd

# `actual_minutes` is written by the delivery-completion event, which lands a
# median of 1h52m after the drop. A day is fully labelled by 02:00 UTC.
DAY_TABLE = "analytics.delivery_eta_scored"


def load_day(day: dt.date) -> pd.DataFrame:
    """One UTC day of scored deliveries, features plus prediction plus label."""
    raise NotImplementedError("bound at runtime by the Airflow operator")


def load_range(start: dt.date, end: dt.date) -> pd.DataFrame:
    raise NotImplementedError("bound at runtime by the Airflow operator")
