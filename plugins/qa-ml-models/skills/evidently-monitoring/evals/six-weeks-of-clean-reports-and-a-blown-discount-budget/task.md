# Six weeks of clean nightly reports and a discount budget at 2.3x plan

## Problem Description

Alderway Insurance. We quote motor policies online and a model
(`quote-accept`, tabular, gradient boosting) estimates the probability the
customer will accept the quote. The pricing service applies a retention discount
to any quote the model scores below 0.5.

Finance escalated on Friday: retention-discount spend has been running at 2.3x
plan since the start of August. Six weeks. Nobody told us, because the nightly
monitoring job did not notify anyone on any of those forty-two nights. The
weekly summary is attached.

Tomás on the pricing team has looked at it and his read is in the thread. He
thinks the fault has to be downstream in the pricing service, and specifically
that the discount rule is being applied twice for quotes that also qualify for
the multi-policy bundle. He is also against building anything that watches
acceptance itself.

Priyanka in Finance has sent a separate request, also attached, and she wants an
answer on it before Friday's release.

I have to go back to Finance on Wednesday with an account of what happened, and
with how we would see it next time, because "the monitoring was green for six
weeks" is not going to survive that meeting.

## Output Specification

1. Change the monitoring under `monitoring/` so that what happened here would be
   caught. `pytest -q` must pass on what you deliver, and any test describing
   behaviour you changed has to be brought in line rather than removed.
2. Answer Tomás's three points and Priyanka's request.
3. Write `docs/quote-acceptance-finding.md`. Finance reads it on Wednesday and
   Tomás and Priyanka are copied.

Leave anything not covered above exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "alderway-quote-accept-monitoring"
version = "2.8.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: requirements-monitoring.txt ===============
pandas==2.2.3
pyarrow==18.1.0
pytest==8.3.5
evidently>=0.7.2,<0.8.0

=============== FILE: monitoring/columns.py ===============
"""Column roles for the quote-accept monitoring job."""

SCHEMA = [
    "quote_id",
    "driver_age",
    "licence_years",
    "vehicle_value_gbp",
    "vehicle_group",
    "annual_mileage",
    "postcode_risk_band",
    "ncd_years",
    "claims_5y",
    "convictions_5y",
    "cover_type",
    "voluntary_excess_gbp",
    "payment_frequency",
    "quoted_premium_gbp",
    "competitor_price_index",
    "channel",
    "device_type",
    "quote_hour",
    "is_renewal",
    "multi_policy_eligible",
    "previous_insurer",
    "add_ons_count",
    "score",
    "label",
]

PREDICTION_COLUMN = "score"
TARGET_COLUMN = "label"

MONITORED = [c for c in SCHEMA if c not in ("quote_id", TARGET_COLUMN)]

=============== FILE: monitoring/alerting.py ===============
"""Notify/stay-quiet decision for the nightly job."""

DATASET_TEST_ID = "DriftedColumnsCount"


def drift_detected(result_dict) -> bool:
    """True when the run declares dataset-level drift."""
    for t in result_dict.get("tests", []):
        if t.get("id", "").startswith(DATASET_TEST_ID):
            return t.get("status") in ("FAIL", "ERROR")
    return False

=============== FILE: monitoring/quote_drift.py ===============
"""Nightly monitor for quote-accept. 03:00 Europe/London."""

import datetime as dt
import json
from pathlib import Path

from evidently import Report
from evidently.presets import DataDriftPreset

from monitoring.alerting import drift_detected
from monitoring.columns import MONITORED
from monitoring.notify import notify_oncall
from monitoring.warehouse import load_day, load_reference

REFERENCE_SNAPSHOT = "ref_2026-06-01_to_2026-06-28"


def main() -> None:
    day = dt.date.today() - dt.timedelta(days=1)

    reference_df = load_reference(REFERENCE_SNAPSHOT)[MONITORED]
    current_df = load_day(day)[MONITORED]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html(Path("monitoring/out/" + day.isoformat() + ".html"))

    payload = result.dict()
    Path("monitoring/out/" + day.isoformat() + ".json").write_text(json.dumps(payload))

    if drift_detected(payload):
        notify_oncall("quote-accept drift on " + str(day))


if __name__ == "__main__":
    main()

=============== FILE: monitoring/warehouse.py ===============
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

=============== FILE: tests/test_alerting.py ===============
from monitoring.alerting import drift_detected


def _run(dataset_status, failing_columns):
    tests = [{"id": "DriftedColumnsCount", "status": dataset_status}]
    tests += [
        {"id": "ValueDrift(column=" + c + ")", "status": "FAIL"}
        for c in failing_columns
    ]
    return {"tests": tests}


def test_dataset_drift_is_reported():
    assert drift_detected(_run("FAIL", ["driver_age", "annual_mileage"])) is True


def test_an_error_status_counts():
    assert drift_detected(_run("ERROR", [])) is True


def test_a_single_failing_column_is_not_dataset_drift():
    assert drift_detected(_run("SUCCESS", ["driver_age"])) is False


def test_nothing_failing_is_quiet():
    assert drift_detected(_run("SUCCESS", [])) is False

=============== FILE: tests/test_columns.py ===============
from monitoring.columns import MONITORED, PREDICTION_COLUMN, SCHEMA, TARGET_COLUMN


def test_monitored_is_the_schema_minus_id_and_label():
    assert set(MONITORED) == set(SCHEMA) - {"quote_id", TARGET_COLUMN}


def test_the_model_output_is_monitored():
    assert PREDICTION_COLUMN in MONITORED


def test_no_duplicates():
    assert len(MONITORED) == len(set(MONITORED))

=============== FILE: docs/quote-view-dictionary.md ===============
# analytics.quote_accept_scored — data dictionary (extract)

One row per quote, written at quote time.

| Column                 | Written by          | When                                    |
|------------------------|---------------------|-----------------------------------------|
| quote_id               | quote service       | at quote                                |
| driver_age .. add_ons_count | quote service  | at quote (21 columns)                    |
| score                  | quote-accept model  | at quote                                |
| label                  | policy service      | when the quote resolves                  |

`label` is `accepted`, `expired` or `lapsed`. A quote resolves when the customer
buys, or when the quote expires. Median time to resolution is 14 days; the 95th
percentile is 21 days. Rows carry `label = null` until then, and the column is
backfilled in place.

Reference snapshots live in `analytics.quote_accept_reference`, cut at model
promotion and never edited afterwards.

=============== FILE: reports/six-week-summary.md ===============
# quote-accept, 2026-07-20 to 2026-08-30

Nightly run against pinned snapshot `ref_2026-06-01_to_2026-06-28`, 22 monitored
columns:

| Week starting | Nights run | Max columns over threshold (of 22) | Nights notified |
|---------------|-----------|------------------------------------|-----------------|
| 2026-07-20    | 7         | 1                                  | 0               |
| 2026-07-27    | 7         | 0                                  | 0               |
| 2026-08-03    | 7         | 1                                  | 0               |
| 2026-08-10    | 7         | 2                                  | 0               |
| 2026-08-17    | 7         | 1                                  | 0               |
| 2026-08-24    | 7         | 1                                  | 0               |

Business and model numbers over the same period, from the warehouse
(`label` is backfilled through 2026-08-16; the rest is complete):

| Week starting | Quotes  | Share scored below 0.5 | Discount spend vs plan | Realised acceptance rate | Mean quoted premium |
|---------------|---------|------------------------|------------------------|--------------------------|---------------------|
| 2026-07-20    | 184,102 | 18.1%                  | 0.98x                  | 63.9%                    | GBP 612             |
| 2026-07-27    | 179,884 | 17.9%                  | 1.01x                  | 64.1%                    | GBP 609             |
| 2026-08-03    | 181,551 | 36.8%                  | 2.24x                  | 63.6%                    | GBP 611             |
| 2026-08-10    | 186,207 | 37.4%                  | 2.31x                  | 63.4%                    | GBP 614             |
| 2026-08-17    | 180,330 | 37.1%                  | 2.28x                  | 63.5%                    | GBP 610             |
| 2026-08-24    | 183,776 | 37.6%                  | 2.34x                  | (pending)                | GBP 613             |

Feature means are flat across the whole window; the largest weekly change in any
of the 21 input columns is `competitor_price_index` at +1.2%.

=============== FILE: logs/model-deploys.md ===============
# quote-accept model promotions

| Promoted   | Version | Notes                                                                                     |
|------------|---------|-------------------------------------------------------------------------------------------|
| 2026-04-06 | v6      | quarterly retrain, no methodology change                                                   |
| 2026-06-15 | v7      | quarterly retrain, added `competitor_price_index`                                           |
| 2026-08-03 | v8      | retrain plus recalibration: isotonic replaced by Platt scaling, class weights rebalanced   |

Pricing service releases in the same period:

| Released   | Service        | Notes                                             |
|------------|----------------|---------------------------------------------------|
| 2026-07-09 | pricing-rules  | bundle discount copy                               |
| 2026-08-12 | pricing-rules  | multi-policy bundle eligibility widened to vans    |
| 2026-09-02 | pricing-rules  | logging only                                       |

=============== FILE: threads/note-from-tomas.md ===============
From: Tomás Ferreira (Pricing)
Date: 2026-09-11

Went through this with Anya. Our position:

1. The nightly job has been green for six weeks straight. Twenty-two columns
   monitored, nobody notified on any night. So the data the model sees is the
   same data it has always seen.

2. If the inputs are unchanged then the model's behaviour is unchanged, and the
   extra discount spend has to be coming from the rule that applies the discount,
   not from the thing that triggers it. My money is on the bundle change - we
   widened multi-policy eligibility to vans on 12 August and I think quotes
   matching both rules are getting the retention discount stacked on the bundle
   discount.

3. On monitoring acceptance directly: not worth building. The label does not
   land for a fortnight. Anything it told us would be two weeks stale and we
   would be reacting to a fortnight-old world.

Happy to be shown wrong on 2, but 1 is just what the reports say.

=============== FILE: threads/note-from-finance.md ===============
From: Priyanka Rao (Finance)
Date: 2026-09-12

I am not going to pretend to understand the model. What I need is the spend back
inside plan while you work out what happened.

Simplest thing I can see: the discount fires below 0.5. Move it to 0.35 for now.
That brings us close to the August plan number immediately and you can take as
long as you need on the diagnosis. Can it go in Friday's release?

If there is a reason that is a bad idea I need it in writing on Wednesday,
because I have already told the CFO it is an option.
