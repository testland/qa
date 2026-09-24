# Our ETA model lost five minutes of accuracy over four months and nothing paged

## Problem Description

I run the delivery-ETA model at Rivermark (grocery delivery, tabular gradient
boosting, predicts minutes-to-doorstep). Ops escalated last week that customers
are getting ETAs that are wrong by a lot more than they used to be. The weekly
numbers say mean absolute error has gone from 4.1 minutes in week 20 to 9.8
minutes in week 38. Nineteen consecutive weeks of getting worse, one model
version, no retrain anywhere in the window.

The nightly monitoring job ran every one of those nights. It is not a job nobody
wired up: it has paged three times in eighteen months and all three were real —
a courier-app release that broke `distance_km`, a warehouse cutover, and one bad
deploy that we rolled back on the strength of it. People believe it. Across those
nineteen weeks it did not report a single drifted column on a single night, and
it notified nobody.

So I have a monitor with a good track record, running nightly, reporting
numbers, through four months of the model getting steadily worse, and it never
said a word. I have to write the postmortem and "our monitoring was not
sensitive enough" is not going to be accepted.

Renata on my team has sent the attached note with three things she wants done
before the postmortem goes out, so we have something to point at. I would like a
straight answer on each of them rather than a merge.

## Output Specification

1. Make the nightly monitoring capable of catching a decay of this shape while
   it is happening. Change whatever under `monitoring/` that requires.
2. `pytest -q` must pass on what you deliver. Any test that describes behaviour
   you changed has to be brought in line rather than removed.
3. Answer Renata's three requests one by one.
4. Write `docs/postmortem-eta-decay.md`: why nineteen weeks of continuous
   degradation produced no notification.

Leave anything not covered above exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "rivermark-eta-monitoring"
version = "3.2.1"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: requirements-monitoring.txt ===============
pandas==2.2.3
pyarrow==18.1.0
pytest==8.3.5
evidently>=0.7.2,<0.8.0

=============== FILE: monitoring/features.py ===============
"""Column roles for the delivery-eta monitoring job."""

TARGET_COLUMN = "actual_minutes"
PREDICTION_COLUMN = "predicted_minutes"

FEATURES = [
    "distance_km",
    "avg_courier_speed_kmh",
    "orders_in_flight_at_pick",
    "pick_pack_minutes",
    "store_queue_depth",
    "hour_of_day",
    "day_of_week",
    "store_id",
    "courier_tier",
    "traffic_index",
]

=============== FILE: monitoring/baseline.py ===============
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

=============== FILE: monitoring/alerting.py ===============
"""Page/no-page decision for the nightly job."""


def should_page(result_dict) -> bool:
    """True when the run contains something worth waking someone for."""
    tests = result_dict.get("tests", [])
    if not tests:
        raise ValueError("run carried no tests")
    return any(t.get("status") in ("FAIL", "ERROR") for t in tests)

=============== FILE: monitoring/nightly_drift.py ===============
"""Nightly monitor for delivery-eta. 02:45 UTC from Airflow."""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.features import FEATURES
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"
MONITORED = FEATURES


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)[MONITORED]
    current_df = load_day(day)[MONITORED]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta drift on " + str(day))

    baseline.archive(load_day(day), BASELINE, day)


if __name__ == "__main__":
    main()

=============== FILE: monitoring/warehouse.py ===============
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

=============== FILE: tests/test_alerting.py ===============
import pytest

from monitoring.alerting import should_page


def test_pages_when_a_test_failed():
    assert should_page({"tests": [{"status": "FAIL"}]}) is True


def test_pages_on_error_status():
    assert should_page({"tests": [{"status": "ERROR"}]}) is True


def test_quiet_when_every_test_passed():
    assert should_page({"tests": [{"status": "SUCCESS"}]}) is False


def test_a_run_with_no_tests_is_a_bug_not_a_quiet_night():
    with pytest.raises(ValueError):
        should_page({"metrics": [{"id": "MAE", "value": 9.1}]})

=============== FILE: tests/test_monitored_columns.py ===============
from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN
from monitoring.nightly_drift import MONITORED


def test_monitored_set_matches_the_feature_list():
    assert list(MONITORED) == list(FEATURES)


def test_no_duplicates():
    assert len(MONITORED) == len(set(MONITORED))


def test_outputs_are_not_listed_as_features():
    assert PREDICTION_COLUMN not in FEATURES
    assert TARGET_COLUMN not in FEATURES

=============== FILE: reports/weekly-mae.md ===============
# delivery-eta weekly quality, weeks 20-38 (2026)

Compiled by hand by DS on Mondays from the warehouse. `actual_minutes` is
complete for every one of these weeks.

| Week | MAE (min) | Max nightly share of drifted columns | Pages | Model  |
|------|-----------|--------------------------------------|-------|--------|
| 20   | 4.1       | 0.000                                | 0     | eta-v6 |
| 22   | 4.4       | 0.000                                | 0     | eta-v6 |
| 24   | 4.9       | 0.000                                | 0     | eta-v6 |
| 26   | 5.4       | 0.000                                | 0     | eta-v6 |
| 28   | 6.0       | 0.000                                | 0     | eta-v6 |
| 30   | 6.7       | 0.000                                | 0     | eta-v6 |
| 32   | 7.4       | 0.000                                | 0     | eta-v6 |
| 34   | 8.2       | 0.000                                | 0     | eta-v6 |
| 36   | 9.0       | 0.000                                | 0     | eta-v6 |
| 38   | 9.8       | 0.000                                | 0     | eta-v6 |

No retrain in this window. eta-v6 has been serving since week 14.

Warehouse means over the same window, straight from the day table:

| Column                   | Week 20 | Week 38 | Total change | Per week |
|--------------------------|---------|---------|--------------|----------|
| avg_courier_speed_kmh    | 21.4    | 18.2    | -15.0%       | -0.82%   |
| orders_in_flight_at_pick | 3.1     | 4.6     | +48.4%       | +2.1%    |
| distance_km              | 3.8     | 4.1     | +7.9%        | +0.42%   |
| pick_pack_minutes        | 6.2     | 8.0     | +29.0%       | +1.4%    |
| store_queue_depth        | 2.4     | 3.9     | +62.5%       | +2.6%    |
| predicted_minutes        | 24.6    | 25.1    | +2.0%        | +0.11%   |
| actual_minutes           | 25.9    | 32.4    | +25.1%       | +1.2%    |

=============== FILE: docs/oncall-runbook-extract.md ===============
# delivery-eta on-call, relevant extract

- One nightly job from Airflow: `monitoring.nightly_drift` at 02:45 UTC.
  Notifications go to #eta-oncall.
- Pages in eighteen months: 2025-11-04 (courier app broke `distance_km`),
  2026-02-19 (warehouse cutover), 2026-04-30 (bad deploy, rolled back).
- The job compares last night against `eta_v6_normal`, the snapshot cut when
  eta-v6 was promoted in week 14. The jobs read it; they do not write it.
- `monitoring/out/` is retained for 90 days. Anyone can open last night's HTML;
  nobody does unless something pages.
- Retrains are manual and require a written promotion note. The last promotion
  note is eta-v6, week 14 2026.

=============== FILE: proposals/renata-note.md ===============
From: Renata Oyelaran
Subject: three things before the postmortem

I have looked at this for two days. Three things, and I would like all three in
before Thursday.

1. Put a hard number on it. MAE under 6 minutes or we get woken up. Six is
   roughly where the complaints started, and a monitor that cannot produce a
   number anyone can argue about is not a monitor.

2. Clear out `monitoring/baselines/` and reseed it from August traffic. Whatever
   is in there is months old at this point and half the columns will scream the
   moment we start looking properly, which is exactly the noise that gets a
   monitor muted. Start from something current and clean.

3. Drop `store_id` and `courier_tier` from the monitored set. They are
   high-cardinality categoricals, they are the only two that ever wobble, and
   they have never once meant anything. Fewer columns, fewer false alarms.
