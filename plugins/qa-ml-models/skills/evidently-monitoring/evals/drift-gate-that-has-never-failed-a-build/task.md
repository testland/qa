# Our release drift check has passed 41 times running, including the week we broke

## Problem Description

We score consumer loan applications with a tabular model (`risk-scorer`). Since
February every release candidate runs a drift check before it can ship.
Forty-one candidates, zero blocks.

On 2026-08-18 our address-verification vendor changed `employment_status` from
strings to integer codes and started sending nulls for `months_at_address` on
roughly a third of applications. Approval rate went up six points, precision
fell from 0.81 to 0.52, and it ran that way for nine days. Risk Ops found it. We
did not.

This morning I pulled the production extract for that week
(`/tmp/prod_week.parquet`, 214k rows) and ran the gate against it by hand. It
printed `drift gate: passed`. Opening the HTML that same run wrote,
`employment_status` and `months_at_address` are plainly shifted — you can see it
by eye in the report the gate itself produced.

Priya on the platform team has a PR open with her diagnosis and a patch; the
diff and her covering note are attached. She has three changes in it. She has
already been through the input files and says they are fine — the candidate is
scored against the held-out split, which is data the model has never seen, which
she says is exactly what a release check should use. Her view is that the
problem is entirely in how the check reaches its verdict and how generous the
thresholds are. The team merges it Thursday unless someone has a better answer.

I want two things. A gate that actually blocks a candidate when a feed changes
the way that one did. And something I can hand Risk Ops, because the first
question in that meeting is going to be how forty-one candidates went through
clean, including the two we cut while the model was broken.

## Output Specification

1. Make the release gate capable of blocking. Change whatever under `ci/`, the
   workflow, or the wiring around them that requires.
2. `pytest -q` must pass on what you deliver. Any test that describes behaviour
   you changed has to be brought in line rather than removed.
3. Give a part-by-part verdict on `proposals/tighten-the-gate.diff` — which of
   Priya's three changes you are taking and which you are not.
4. Write `docs/why-the-gate-never-fired.md` for Risk Ops.

Leave anything not covered above exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: requirements-ci.txt ===============
pandas==2.2.3
pyarrow==18.1.0
scikit-learn==1.5.2
pytest==8.3.5
evidently>=0.7.1,<0.8.0

=============== FILE: pyproject.toml ===============
[project]
name = "risk-scorer-ci"
version = "1.4.0"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

=============== FILE: ci/drift_gate.py ===============
"""Release drift gate. Runs on every release candidate."""

import sys

from evidently import Report
from evidently.presets import DataDriftPreset

from ci.datasets import current_dataset, reference_dataset
from ci.gate_decision import should_block


def main() -> int:
    reference_df = reference_dataset()
    current_df = current_dataset()

    report = Report([DataDriftPreset()])
    result = report.run(reference_data=reference_df, current_data=current_df)
    result.save_html("drift_report.html")

    if should_block(result.dict()):
        print("drift gate: BLOCK")
        return 1

    print("drift gate: passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

=============== FILE: ci/datasets.py ===============
"""The two datasets the release gate compares."""

from pathlib import Path

import pandas as pd

DATA_DIR = Path("data")


def reference_dataset() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "train_sample.parquet")


def current_dataset() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "candidate_eval.parquet")

=============== FILE: ci/gate_decision.py ===============
def should_block(result_dict) -> bool:
    """True when the drift report says this release candidate must not ship."""
    failed = [
        t for t in result_dict.get("tests", [])
        if t.get("status") in ("FAIL", "ERROR")
    ]
    return bool(failed)

=============== FILE: ci/feature_names.py ===============
MODEL_FEATURES = [
    "employment_status",
    "months_at_address",
    "monthly_income",
    "requested_amount",
    "existing_debt_ratio",
    "prior_defaults",
]

WAREHOUSE_COLUMNS = MODEL_FEATURES + [
    "application_id",
    "submitted_at",
    "decision",
]

=============== FILE: jobs/train_export.py ===============
"""Monthly training export for risk-scorer. Run by the training DAG."""

from pathlib import Path

from sklearn.model_selection import train_test_split

from warehouse import query

OUT = Path("data")

SOURCE_SQL = """
select application_id, submitted_at, employment_status, months_at_address,
       monthly_income, requested_amount, existing_debt_ratio, prior_defaults,
       decision
from warehouse.applications
where decided_at < date '2026-03-01'
  and decision is not null
"""


def main() -> None:
    df = query(SOURCE_SQL)
    fit, held_out = train_test_split(df, test_size=0.2, random_state=7)

    fit.to_parquet(OUT / "train_full.parquet")
    fit.sample(50_000, random_state=7).to_parquet(OUT / "train_sample.parquet")
    held_out.to_parquet(OUT / "candidate_eval.parquet")


if __name__ == "__main__":
    main()

=============== FILE: tests/test_gate_decision.py ===============
from ci.gate_decision import should_block


def test_blocks_when_a_test_failed():
    assert should_block({"tests": [{"status": "FAIL"}]}) is True


def test_blocks_on_error_status():
    assert should_block({"tests": [{"status": "ERROR"}]}) is True


def test_ships_when_every_test_passed():
    assert should_block({"tests": [{"status": "SUCCESS"}]}) is False


def test_ships_when_the_result_carries_no_tests():
    assert should_block({"metrics": [{"id": "DriftedColumnsCount", "value": 2}]}) is False

=============== FILE: tests/test_feature_parity.py ===============
from ci.feature_names import MODEL_FEATURES, WAREHOUSE_COLUMNS


def test_every_model_feature_exists_in_the_warehouse():
    assert set(MODEL_FEATURES) <= set(WAREHOUSE_COLUMNS)


def test_no_duplicate_feature_names():
    assert len(MODEL_FEATURES) == len(set(MODEL_FEATURES))

=============== FILE: .github/workflows/release.yml ===============
name: release-candidate

on:
  workflow_dispatch:
  push:
    tags: ["rc-*"]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements-ci.txt
      - name: unit tests
        run: pytest -q
      - name: drift gate
        run: python -m ci.drift_gate | tee gate.log
      - name: upload drift report
        uses: actions/upload-artifact@v4
        with:
          name: drift-report
          path: drift_report.html

=============== FILE: docs/gate-runs.md ===============
# Drift gate history

| Candidate | Date       | Gate output        | Job result | Notes                          |
|-----------|------------|--------------------|------------|--------------------------------|
| rc-1.0.0  | 2026-02-10 | drift gate: passed | green      | first run                      |
| rc-1.0.1  | 2026-02-24 | drift gate: passed | green      |                                |
| ...       | ...        | drift gate: passed | green      | 36 further candidates          |
| rc-1.3.7  | 2026-08-12 | drift gate: passed | green      |                                |
| rc-1.3.8  | 2026-08-19 | drift gate: passed | green      | vendor encoding change shipped |
| rc-1.3.9  | 2026-08-26 | drift gate: passed | green      | precision already at 0.55      |
| rc-1.4.0  | 2026-09-02 | drift gate: passed | green      | after the rollback             |

41 candidates, 0 blocks, 0 red jobs.

The training DAG runs on the first Sunday of the month; last successful run
2026-08-30. Everything under `data/` is written by that DAG and by nothing else.

Manual re-run on 2026-09-11 of the rc-1.3.8 tree, with the current dataset
swapped by hand for the 2026-08-18..2026-08-27 production extract
(`/tmp/prod_week.parquet`, 214k rows): `drift gate: passed`.

=============== FILE: proposals/tighten-the-gate.diff ===============
From: Priya Shanbhag <priya@riskeng.example>
Subject: [PATCH] make the release gate able to block

I went through the inputs first and they are not the problem. The candidate is
scored against the held-out split, which is data the model has never seen, so
that is the right comparison for a release check. Three changes, all in the
check itself:

1. A report only renders. It cannot pass or fail anything - that is what the
   test-suite class is for, and it is why we have never once seen a BLOCK.
2. Every column sits on the library default. Defaults are textbook numbers. Put
   the lot on 0.02 and anything that moves gets caught.
3. We lose the report whenever the job goes red, which is the one time we want
   it. Upload it either way.

--- a/ci/drift_gate.py
+++ b/ci/drift_gate.py
@@
-from evidently import Report
-from evidently.presets import DataDriftPreset
+from evidently.test_suite import TestSuite
+from evidently.test_preset import DataDriftTestPreset
@@
-    report = Report([DataDriftPreset()])
-    result = report.run(reference_data=reference_df, current_data=current_df)
-    result.save_html("drift_report.html")
-
-    if should_block(result.dict()):
+    suite = TestSuite(tests=[DataDriftTestPreset(stattest_threshold=0.02)])
+    suite.run(reference_data=reference_df, current_data=current_df)
+    suite.save_html("drift_report.html")
+
+    if not suite.as_dict()["summary"]["all_passed"]:
         print("drift gate: BLOCK")
         return 1

--- a/.github/workflows/release.yml
+++ b/.github/workflows/release.yml
@@
       - name: upload drift report
+        if: always()
         uses: actions/upload-artifact@v4
         with:
           name: drift-report
           path: drift_report.html
