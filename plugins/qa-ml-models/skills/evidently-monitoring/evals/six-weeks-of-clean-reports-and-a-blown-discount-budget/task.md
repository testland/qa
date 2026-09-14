# Six weeks of clean nightly reports and a discount budget at 2.3x plan

## Problem Description

Alderway Insurance. We quote motor policies online and a model
(`quote-accept`, tabular, gradient boosting) estimates the probability the
customer will accept the quote. The pricing service applies a retention discount
to any quote the model scores below 0.5.

Finance escalated on Friday: retention-discount spend has been running at 2.3x
plan since the start of August. Six weeks. Nobody told us, because the nightly
monitoring job did not notify anyone on any of those forty-two nights. I have
the weekly summary attached and two of the nightly dumps.

Before anyone asks: the monitored set is not some cut-down list. It is every
column in the scoring view except the quote id and the acceptance label, which
does not exist yet on the night the quote is written. Twenty-two columns,
including everything the pricing service reads.

Tomás on the pricing team has looked at it and his read is in the thread: if the
inputs have not moved for six weeks then the model is doing the same thing it has
always done, so the fault has to be downstream in the pricing service, and he
thinks the discount rule is being applied twice for quotes that also qualify for
the multi-policy bundle. He also says there is no point monitoring acceptance
itself because the label does not land for fourteen days, by which point it is
history.

I have to go back to Finance on Wednesday with an answer about what happened,
and I have to tell them how we would see it next time, because "the monitoring
was green for six weeks" is not going to survive that meeting.

## Output Specification

1. Change the monitoring under `monitoring/` so a change of the kind that
   produced this is visible on the night it happens. `pytest -q` must pass on
   what you deliver, and any test describing behaviour you changed has to be
   brought in line rather than removed.
2. Tomás's point 3 needs an answer in code, not only in prose. Deliver whatever
   follows from the position you take on it.
3. Write `docs/quote-acceptance-finding.md`. Finance reads it on Wednesday and
   Tomás is copied.

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
"""Column roles for the quote-accept monitoring jobs."""

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

# label is not written until the quote is accepted, expired or lapsed.
LABEL_LAG_DAYS = 14

# The nightly job compares everything that exists on the night.
MONITORED = [c for c in SCHEMA if c not in ("quote_id", TARGET_COLUMN)]

=============== FILE: monitoring/alerting.py ===============
"""Notify/stay-quiet decision for the nightly job."""

DATASET_DRIFT_SHARE = 0.5


def drift_detected(result_dict) -> bool:
    """True when the run declares dataset-level drift."""
    tests = result_dict.get("tests", [])
    if not tests:
        return False
    failed = [t for t in tests if t.get("status") in ("FAIL", "ERROR")]
    return len(failed) / len(tests) >= DATASET_DRIFT_SHARE

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

=============== FILE: tests/test_alerting.py ===============
from monitoring.alerting import drift_detected


def _tests(failed, passed):
    return {"tests": [{"status": "FAIL"}] * failed + [{"status": "SUCCESS"}] * passed}


def test_dataset_drift_when_most_columns_fail():
    assert drift_detected(_tests(12, 10)) is True


def test_no_dataset_drift_when_one_column_fails():
    assert drift_detected(_tests(1, 21)) is False


def test_no_dataset_drift_when_nothing_fails():
    assert drift_detected(_tests(0, 22)) is False


def test_a_run_carrying_no_tests_reports_nothing():
    assert drift_detected({"metrics": []}) is False

=============== FILE: tests/test_columns.py ===============
from monitoring.columns import MONITORED, PREDICTION_COLUMN, SCHEMA, TARGET_COLUMN


def test_monitored_is_the_schema_minus_id_and_label():
    assert set(MONITORED) == set(SCHEMA) - {"quote_id", TARGET_COLUMN}


def test_the_model_output_is_monitored():
    assert PREDICTION_COLUMN in MONITORED


def test_no_duplicates():
    assert len(MONITORED) == len(set(MONITORED))

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
(`label` backfilled through 2026-08-16, the rest is complete):

| Week starting | Quotes  | Share scored below 0.5 | Discount spend vs plan | Realised acceptance rate | Mean quoted premium |
|---------------|---------|------------------------|------------------------|--------------------------|---------------------|
| 2026-07-20    | 184,102 | 18.1%                  | 0.98x                  | 63.9%                    | GBP 612             |
| 2026-07-27    | 179,884 | 17.9%                  | 1.01x                  | 64.1%                    | GBP 609             |
| 2026-08-03    | 181,551 | 36.8%                  | 2.24x                  | 63.6%                    | GBP 611             |
| 2026-08-10    | 186,207 | 37.4%                  | 2.31x                  | 63.4%                    | GBP 614             |
| 2026-08-17    | 180,330 | 37.1%                  | 2.28x                  | 63.5%                    | GBP 610             |
| 2026-08-24    | 183,776 | 37.6%                  | 2.34x                  | (pending)                | GBP 613             |

Feature means are flat across the whole window; the largest weekly change in any
of the 21 input features is `competitor_price_index` at +1.2%.

=============== FILE: monitoring/out/2026-07-28.json ===============
{
  "run": "2026-07-28",
  "reference": "ref_2026-06-01_to_2026-06-28",
  "tests": [
    {"column": "driver_age", "method": "wasserstein", "drift_score": 0.021, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "quoted_premium_gbp", "method": "wasserstein", "drift_score": 0.038, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "competitor_price_index", "method": "wasserstein", "drift_score": 0.044, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "multi_policy_eligible", "method": "jensenshannon", "drift_score": 0.012, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "score", "method": "wasserstein", "drift_score": 0.031, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "...17 more", "method": "various", "drift_score": null, "threshold": 0.1, "status": "SUCCESS"}
  ],
  "notified": false
}

=============== FILE: monitoring/out/2026-08-14.json ===============
{
  "run": "2026-08-14",
  "reference": "ref_2026-06-01_to_2026-06-28",
  "tests": [
    {"column": "driver_age", "method": "wasserstein", "drift_score": 0.019, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "quoted_premium_gbp", "method": "wasserstein", "drift_score": 0.027, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "competitor_price_index", "method": "wasserstein", "drift_score": 0.051, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "multi_policy_eligible", "method": "jensenshannon", "drift_score": 0.061, "threshold": 0.1, "status": "SUCCESS"},
    {"column": "score", "method": "wasserstein", "drift_score": 0.318, "threshold": 0.1, "status": "FAIL"},
    {"column": "...17 more", "method": "various", "drift_score": null, "threshold": 0.1, "status": "SUCCESS"}
  ],
  "notified": false
}

=============== FILE: logs/model-deploys.md ===============
# quote-accept model promotions

| Promoted   | Version | Notes                                                                                    |
|------------|---------|------------------------------------------------------------------------------------------|
| 2026-04-06 | v6      | quarterly retrain, no methodology change                                                  |
| 2026-06-15 | v7      | quarterly retrain, added `competitor_price_index`                                          |
| 2026-08-03 | v8      | retrain plus recalibration: isotonic replaced by Platt scaling, class weights rebalanced  |

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

3. On monitoring acceptance directly: not worth building. The label does not land
   for fourteen days. Anything it told us would be a fortnight stale and we would
   be reacting to a fortnight-old world.

Happy to be shown wrong on 2, but 1 is just what the reports say.
