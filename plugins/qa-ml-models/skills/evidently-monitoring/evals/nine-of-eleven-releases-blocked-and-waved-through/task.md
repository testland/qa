# Nine of our last eleven release candidates were blocked and then waved through

## Problem Description

We added a pre-deploy data check to the churn model (`churn-propensity`,
tabular, retrained monthly) in June. Since then we have cut eleven release
candidates and the check has blocked nine of them. All nine were overridden by
hand after someone eyeballed the report, because in every case the person
looking decided it was not a real problem. The override log is attached, as is
the model card.

The situation now is that nobody reads the report. The block is a formality, the
override is a keystroke, and on 2026-08-21 the one candidate the check blocked
for what turned out to be a genuine reason got overridden in four minutes by the
same reflex, went to production, and cost us three points of AUC over the
following week before we rolled back.

There is also a warning that the check has printed on every single run since
late June, which everybody scrolls past.

Marek, who runs the platform team, has sent the attached patch. He has three
changes in it and his covering note is in the diff. He is not wrong about the
override count - it is eleven candidates, nine blocks, and not one of those
blocks told anyone anything they did not already know, except the one that
mattered, which nobody believed. The team merges it Thursday unless there is a
better answer.

I would rather have a check people believe than one that is technically
stricter. I am not comfortable with where his patch lands us either, but I
cannot articulate why, and "it feels wrong" will not survive Thursday.

## Output Specification

1. Rewrite `ci/churn_drift_gate.py` and `ci/gate_config.py` so that the next
   rc-6.4.0 is not waved through in four minutes.
2. Update `tests/test_gate_config.py` so it describes the policy you deliver.
   `pytest -q` must pass on what you hand back.
3. Write `docs/gate-policy.md`. It has to give a part-by-part verdict on
   `proposals/tune-the-gate.diff` - which of Marek's three changes you are
   taking and which you are not, and why.

Do not change `ci/schema.py`; the column inventory is generated from the
warehouse and other jobs read it.

## Input Files

Extract the following files before beginning.

=============== FILE: pyproject.toml ===============
[project]
name = "churn-propensity-ci"
version = "6.5.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: requirements-ci.txt ===============
pandas==2.2.3
pyarrow==18.1.0
pytest==8.3.5
evidently>=0.7.2,<0.8.0

=============== FILE: ci/schema.py ===============
"""Generated from the warehouse scoring view. Do not edit by hand."""

ALL_COLUMNS = [
    "account_id",
    "avg_ticket_resolution_h",
    "billing_system_version",
    "churn_label",
    "churn_score",
    "contract_type",
    "crm_owner_email",
    "days_since_last_login",
    "discount_pct",
    "etl_batch_id",
    "feature_adoption_score",
    "industry_code",
    "ingested_at",
    "invoice_disputes_12m",
    "last_sync_at",
    "logins_30d",
    "monthly_charges",
    "nps_last",
    "overage_events_90d",
    "paperless_billing",
    "payment_method",
    "raw_user_agent",
    "record_checksum",
    "renewal_window_days",
    "request_id",
    "scored_at",
    "seats_active_30d",
    "seats_licensed",
    "session_uuid",
    "source_region",
    "support_note",
    "support_tickets_90d",
    "tenure_months",
    "total_charges",
]

=============== FILE: ci/model_card.md ===============
# churn-propensity, model card (extract)

Task: binary classification, probability an account churns within 90 days.
Retrained monthly. Serving version 6.5.0.

Trained on 19 columns:

| Column                   | Type        | Column                 | Type        |
|--------------------------|-------------|------------------------|-------------|
| tenure_months            | numeric     | seats_licensed         | numeric     |
| monthly_charges          | numeric     | seats_active_30d       | numeric     |
| total_charges            | numeric     | feature_adoption_score | numeric     |
| contract_type            | categorical | logins_30d             | numeric     |
| payment_method           | categorical | days_since_last_login  | numeric     |
| paperless_billing        | categorical | overage_events_90d     | numeric     |
| support_tickets_90d      | numeric     | invoice_disputes_12m   | numeric     |
| avg_ticket_resolution_h  | numeric     | discount_pct           | numeric     |
| nps_last                 | numeric     | renewal_window_days    | numeric     |
| industry_code            | categorical |                        |             |

Label: `churn_label` (observed at the 90-day horizon, backfilled weekly).
Scored output: `churn_score` (probability, written by the scoring job).

Every other column in the warehouse scoring view is carried for joins, audit and
support lookup. The model does not read them.

=============== FILE: ci/gate_config.py ===============
from ci.schema import ALL_COLUMNS

# Policy since June: nothing in the warehouse goes unmonitored.
MONITORED_COLUMNS = list(ALL_COLUMNS)

REFERENCE = "data/reference_2026-05.parquet"
CANDIDATE = "data/candidate_eval.parquet"

# CI nags when the reference is older than this.
REFERENCE_MAX_AGE_DAYS = 30

=============== FILE: ci/churn_drift_gate.py ===============
"""Pre-deploy data check for churn-propensity. Runs on every release candidate."""

import datetime as dt
import sys
from pathlib import Path

import pandas as pd
from evidently import Report
from evidently.presets import DataDriftPreset

from ci.gate_config import CANDIDATE, MONITORED_COLUMNS, REFERENCE, REFERENCE_MAX_AGE_DAYS


def reference_age_days(path: str) -> int:
    mtime = dt.date.fromtimestamp(Path(path).stat().st_mtime)
    return (dt.date.today() - mtime).days


def main() -> int:
    age = reference_age_days(REFERENCE)
    if age > REFERENCE_MAX_AGE_DAYS:
        print("WARNING: reference is " + str(age) + " days old; consider regenerating it")

    reference_df = pd.read_parquet(REFERENCE)[MONITORED_COLUMNS]
    current_df = pd.read_parquet(CANDIDATE)[MONITORED_COLUMNS]

    report = Report([DataDriftPreset()], include_tests=True)
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html("drift_report.html")

    failed = [t for t in result.dict()["tests"] if t.get("status") in ("FAIL", "ERROR")]
    if failed:
        raise SystemExit("check failed: " + str(len(failed)) + " test(s), see drift_report.html")

    print("check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

=============== FILE: tests/test_gate_config.py ===============
from ci.gate_config import MONITORED_COLUMNS, REFERENCE
from ci.schema import ALL_COLUMNS


def test_every_schema_column_is_monitored():
    assert set(MONITORED_COLUMNS) == set(ALL_COLUMNS)


def test_no_duplicates_in_the_monitored_set():
    assert len(MONITORED_COLUMNS) == len(set(MONITORED_COLUMNS))


def test_reference_is_the_may_snapshot():
    assert REFERENCE.endswith("reference_2026-05.parquet")

=============== FILE: ops/override-log.md ===============
# churn-propensity pre-deploy check, June to September 2026

| RC        | Date       | Result  | Columns that failed                                      | Overridden by | Note                                            |
|-----------|------------|---------|----------------------------------------------------------|---------------|-------------------------------------------------|
| rc-6.1.0  | 2026-06-09 | BLOCKED | request_id, session_uuid, etl_batch_id                   | @marek        | ids are random, obviously                        |
| rc-6.1.1  | 2026-06-23 | BLOCKED | ingested_at, scored_at, last_sync_at                     | @marek        | timestamps move, it is a new month               |
| rc-6.2.0  | 2026-07-07 | passed  | -                                                        | -             |                                                  |
| rc-6.2.1  | 2026-07-14 | BLOCKED | raw_user_agent, support_note                             | @pchen        | browser versions rolled, free text is free text  |
| rc-6.2.2  | 2026-07-21 | BLOCKED | request_id, session_uuid, record_checksum, etl_batch_id  | @marek        | same as last time                                |
| rc-6.3.0  | 2026-07-28 | BLOCKED | ingested_at, scored_at                                   | @pchen        | timestamps                                       |
| rc-6.3.1  | 2026-08-04 | BLOCKED | raw_user_agent, source_region, billing_system_version    | @marek        | billing upgrade, expected                        |
| rc-6.3.2  | 2026-08-11 | BLOCKED | request_id, session_uuid                                 | @pchen        | ids                                              |
| rc-6.4.0  | 2026-08-21 | BLOCKED | tenure_months, monthly_charges, discount_pct, churn_score| @marek        | overridden in 4 min; see incident INC-2211       |
| rc-6.4.1  | 2026-09-01 | BLOCKED | ingested_at, scored_at, last_sync_at, etl_batch_id       | @pchen        | timestamps                                       |
| rc-6.5.0  | 2026-09-08 | passed  | -                                                        | -             |                                                  |

Every run since 2026-06-23 has also printed the stale-reference warning. It read
`123 days old` on the last run.

INC-2211: rc-6.4.0 shipped 2026-08-21. AUC on the weekly holdout fell from 0.812
to 0.779 between 2026-08-22 and 2026-08-28. Root cause was a change in how the
CRM writes `discount_pct` for annual contracts, first present in warehouse rows
from 2026-08-06 onward, which pushed `churn_score` down across the whole
annual-contract segment. Rolled back 2026-08-29.

=============== FILE: proposals/tune-the-gate.diff ===============
From: Marek Dabrowa <marek@example.com>
Subject: [PATCH 3/3] make the pre-deploy check worth reading

Eleven candidates, nine blocks, nine overrides. Three changes.

--- a/ci/gate_config.py
+++ b/ci/gate_config.py
@@
-from ci.schema import ALL_COLUMNS
+from ci.schema import ALL_COLUMNS
+
+# (1) Stop failing on columns the model never reads. These are ids, timestamps,
+# checksums, free text and CRM bookkeeping - they move every month and every
+# single one of them has cost us an override.
+NOT_CONSUMED = [
+    "account_id", "billing_system_version", "crm_owner_email", "etl_batch_id",
+    "ingested_at", "last_sync_at", "raw_user_agent", "record_checksum",
+    "request_id", "scored_at", "session_uuid", "source_region", "support_note",
+]

-# Policy since June: nothing in the warehouse goes unmonitored.
-MONITORED_COLUMNS = list(ALL_COLUMNS)
+# (2) churn_score moves every time marketing runs a campaign. That is a
+# marketing event, not a data problem, and alerting on it is noise by
+# construction. churn_label is backfilled weekly so it is always half empty.
+MONITORED_COLUMNS = [
+    c for c in ALL_COLUMNS
+    if c not in NOT_CONSUMED and c not in ("churn_score", "churn_label")
+]

-REFERENCE = "data/reference_2026-05.parquet"
+# (3) The check has been shouting "123 days old" at us since June and it is
+# right. Build the reference from the trailing four weeks of scored production
+# rows at the start of every run, so we are always comparing the candidate
+# against what production actually looks like now instead of against May.
+REFERENCE = build_trailing_reference(weeks=4)
 CANDIDATE = "data/candidate_eval.parquet"

-# CI nags when the reference is older than this.
-REFERENCE_MAX_AGE_DAYS = 30
+REFERENCE_MAX_AGE_DAYS = 30  # unreachable now, kept so the import does not break

=============== FILE: ops/release-process.md ===============
# churn-propensity release process (extract)

- Retrain runs on the first Monday of the month. A candidate is promoted only
  after a written promotion note signed off by the model owner.
- `data/reference_2026-05.parquet` was cut from the May promotion and has been
  the comparison baseline since. Cutting a new one is a manual step in the
  promotion checklist; it has been skipped at every promotion since May because
  nobody is sure whether it is safe to do while an incident is open.
- `data/candidate_eval.parquet` is the held-out evaluation slice for the
  candidate, built from production scoring rows over the four weeks before the
  candidate was cut.
- An override is recorded in `ops/override-log.md` with a one-line reason. There
  is no second approver.
