# Our ETA model lost five minutes of accuracy over four months and nothing paged

## Problem Description

I run the delivery-ETA model at Rivermark (grocery delivery, tabular gradient
boosting, predicts minutes-to-doorstep). Ops escalated last week that customers
are getting ETAs that are wrong by a lot more than they used to be. I pulled the
weekly numbers: mean absolute error has gone from 4.1 minutes in week 20 to 9.8
minutes in week 38. Nineteen straight weeks of getting worse, on one model
version, with no retrain in the window.

We have two monitoring jobs on this model and both of them ran every night of
it.

The first watches the input data. It has paged three times in eighteen months
and all three were real - a courier-app release that broke `distance_km`, a
warehouse cutover, and one bad deploy. So it is not a job nobody wired up.

The second is supposed to watch accuracy directly. Labels land about two hours
after delivery, so by the time it runs at 02:45 the day it is checking is fully
labelled and the error it is looking at is measured, not estimated. It renders a
report every night into `monitoring/out/`. It has never notified anyone, not
once, including the nights in week 36 when MAE was already 9.0.

Two jobs, both running, both producing real numbers, nineteen weeks of
degradation, zero notifications. I have to write the postmortem and I cannot
currently explain it.

Renata on my team has sent the attached patch for the accuracy job. Her argument
is that the way that job is built means it was never going to alert on anything,
and that while we are in there we should put a hard number on MAE so it pages
when accuracy actually degrades. She wants it merged before the postmortem goes
out so we have something to point at. I would like a straight answer on whether
that patch is the fix, and a postmortem that says what actually happened rather
than "our monitoring was not sensitive enough".

## Output Specification

1. Make the nightly monitoring on this model capable of catching a decay of this
   shape while it is happening. Change whatever under `monitoring/` that
   requires.
2. `pytest -q` must pass on what you deliver. Any test that describes behaviour
   you changed has to be brought in line with what you delivered.
3. Write `docs/postmortem-eta-decay.md`: why nineteen weeks of continuous
   degradation produced no notification from either job, and an explicit verdict
   on `proposals/accuracy-job-patch.diff` - adopt, adapt or reject.

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
"""Column roles for the delivery-eta monitoring jobs."""

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

=============== FILE: monitoring/alerting.py ===============
"""Shared page/no-page decision for both nightly jobs."""


def should_page(report_dict) -> bool:
    """True when the run contains something worth waking someone for."""
    tests = report_dict.get("tests", [])
    return any(t.get("status") in ("FAIL", "ERROR") for t in tests)

=============== FILE: monitoring/nightly_drift.py ===============
"""Nightly input monitor for delivery-eta. 02:15 UTC from Airflow."""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)
    current_df = load_day(day)

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta input drift on " + str(day))
        return

    # quiet night - keep the snapshot on recent normal traffic
    baseline.refresh(current_df, BASELINE)


if __name__ == "__main__":
    main()

=============== FILE: monitoring/quality_check.py ===============
"""Nightly accuracy monitor for delivery-eta. 02:45 UTC, after the input job.

Labels land ~2h after delivery, so the day being checked is fully labelled.
"""

import datetime as dt
from pathlib import Path

from evidently import Report
from evidently.presets import RegressionPreset

from monitoring import baseline
from monitoring.alerting import should_page
from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day

BASELINE = "eta_v6_normal"
COLUMNS = FEATURES + [PREDICTION_COLUMN, TARGET_COLUMN]


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = baseline.load(BASELINE)[COLUMNS]
    current_df = load_day(day)[COLUMNS]

    report = Report([RegressionPreset()])
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/quality-" + day.isoformat() + ".html"))

    if should_page(result.dict()):
        notify_oncall("delivery-eta accuracy on " + str(day))


if __name__ == "__main__":
    main()

=============== FILE: tests/test_alerting.py ===============
from monitoring.alerting import should_page


def test_pages_when_a_test_failed():
    assert should_page({"tests": [{"status": "FAIL"}]}) is True


def test_pages_on_error_status():
    assert should_page({"tests": [{"status": "ERROR"}]}) is True


def test_quiet_when_every_test_passed():
    assert should_page({"tests": [{"status": "SUCCESS"}]}) is False


def test_quiet_when_the_run_carries_no_tests():
    assert should_page({"metrics": [{"id": "MAE", "value": 9.1}]}) is False

=============== FILE: tests/test_features.py ===============
from monitoring.features import FEATURES, PREDICTION_COLUMN, TARGET_COLUMN


def test_no_duplicate_features():
    assert len(FEATURES) == len(set(FEATURES))


def test_outputs_are_not_listed_as_features():
    assert PREDICTION_COLUMN not in FEATURES
    assert TARGET_COLUMN not in FEATURES

=============== FILE: reports/weekly-mae.md ===============
# delivery-eta weekly quality, weeks 20-38 (2026)

Compiled by hand by DS on Mondays from the warehouse. Labels land about two
hours after delivery, so MAE here is measured, not estimated.

| Week | MAE (min) | Input-job pages | Accuracy-job pages | Model  |
|------|-----------|-----------------|--------------------|--------|
| 20   | 4.1       | 0               | 0                  | eta-v6 |
| 22   | 4.4       | 0               | 0                  | eta-v6 |
| 24   | 4.9       | 0               | 0                  | eta-v6 |
| 26   | 5.4       | 0               | 0                  | eta-v6 |
| 28   | 6.0       | 0               | 0                  | eta-v6 |
| 30   | 6.7       | 0               | 0                  | eta-v6 |
| 32   | 7.4       | 0               | 0                  | eta-v6 |
| 34   | 8.2       | 0               | 0                  | eta-v6 |
| 36   | 9.0       | 0               | 0                  | eta-v6 |
| 38   | 9.8       | 0               | 0                  | eta-v6 |

No retrain in this window. eta-v6 has been serving since week 14.

Warehouse feature means over the same window:

| Feature                  | Week 20 | Week 38 | Total change | Per week |
|--------------------------|---------|---------|--------------|----------|
| avg_courier_speed_kmh    | 21.4    | 18.2    | -15.0%       | -0.82%   |
| orders_in_flight_at_pick | 3.1     | 4.6     | +48.4%       | +2.1%    |
| distance_km              | 3.8     | 4.1     | +7.9%        | +0.42%   |
| pick_pack_minutes        | 6.2     | 8.0     | +29.0%       | +1.4%    |
| store_queue_depth        | 2.4     | 3.9     | +62.5%       | +2.6%    |

=============== FILE: monitoring/job-history.json ===============
{
  "model": "delivery-eta",
  "note": "share_drifted = columns over threshold / 34, as reported by each input run",
  "nights": [
    {"date": "2026-09-03", "input_share_drifted": 0.059, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-04", "input_share_drifted": 0.029, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-05", "input_share_drifted": 0.000, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-06", "input_share_drifted": 0.029, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-07", "input_share_drifted": 0.000, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-08", "input_share_drifted": 0.000, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-09", "input_share_drifted": 0.029, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-10", "input_share_drifted": 0.000, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-11", "input_share_drifted": 0.059, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false},
    {"date": "2026-09-12", "input_share_drifted": 0.029, "input_paged": false, "accuracy_report_written": true, "accuracy_paged": false}
  ],
  "max_input_share_drifted_since_week_20": 0.088,
  "input_pages_since_week_20": 0,
  "accuracy_pages_since_week_20": 0,
  "baseline_snapshot": "eta_v6_normal",
  "baseline_snapshot_row_count": 41882,
  "baseline_snapshot_mtime": "2026-09-13T02:19:41Z"
}

=============== FILE: proposals/accuracy-job-patch.diff ===============
From: Renata Oyelaran <renata@rivermark.example>
Subject: [PATCH] make the accuracy job able to fail

--- a/monitoring/quality_check.py
+++ b/monitoring/quality_check.py
@@
-from evidently import Report
-from evidently.presets import RegressionPreset
+from evidently.test_suite import TestSuite
+from evidently.tests import TestValueMAE
@@
-    report = Report([RegressionPreset()])
-    result = report.run(reference_data=reference_df, current_data=current_df)
-    result.save_html(Path("monitoring/out/quality-" + day.isoformat() + ".html"))
-
-    if should_page(result.dict()):
+    suite = TestSuite(tests=[TestValueMAE(lt=6.0)])
+    suite.run(reference_data=reference_df, current_data=current_df)
+    suite.save_html(Path("monitoring/out/quality-" + day.isoformat() + ".html"))
+
+    if not suite.as_dict()["summary"]["all_passed"]:
         notify_oncall("delivery-eta accuracy on " + str(day))

Rationale: a report only renders, it cannot pass or fail anything - that is what
the test-suite class is for, and it is why this job has never notified anyone.
While we are in there, put a hard number on it: MAE under 6 minutes or we get
woken up. 6.0 is roughly where the complaints started.

=============== FILE: docs/oncall-runbook-extract.md ===============
# delivery-eta on-call, relevant extract

- Two nightly jobs, both from Airflow: `monitoring.nightly_drift` at 02:15 UTC
  and `monitoring.quality_check` at 02:45 UTC. Notifications from either go to
  #eta-oncall.
- Pages in eighteen months, all from the input job: 2025-11-04 (courier app
  broke `distance_km`), 2026-02-19 (warehouse cutover), 2026-04-30 (bad deploy,
  rolled back). The accuracy job has never notified.
- `monitoring/out/` is retained for 90 days. Anyone can open last night's HTML;
  nobody does unless something pages.
- `monitoring/baselines/` is not in version control and is not backed up.
- Retrains are manual and require a written promotion note. The last promotion
  note is eta-v6, week 14 2026.
