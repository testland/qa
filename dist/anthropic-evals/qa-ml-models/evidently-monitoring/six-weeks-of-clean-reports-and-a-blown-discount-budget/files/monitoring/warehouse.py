"""Warehouse access for the quote-accept monitoring job."""

import datetime as dt

import pandas as pd

QUOTE_VIEW = "analytics.quote_accept_scored"


def load_day(day: dt.date) -> pd.DataFrame:
    """One day of quotes as they were written, scored, unresolved."""
    raise NotImplementedError("bound at runtime by the scheduler")


def load_window(start: dt.date, end: dt.date) -> pd.DataFrame:
    """A date range of quotes with whatever has resolved by query time."""
    raise NotImplementedError("bound at runtime by the scheduler")


def load_reference(snapshot: str) -> pd.DataFrame:
    """A promoted reference snapshot. Cut at promotion, never edited."""
    raise NotImplementedError("bound at runtime by the scheduler")
