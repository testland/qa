"""Release drift gate. Runs on every release candidate."""

import sys

import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

from ci.gate_decision import should_block

REFERENCE = "data/train_sample.parquet"
CURRENT = "data/candidate_eval.parquet"


def main() -> int:
    reference_df = pd.read_parquet(REFERENCE)
    current_df = pd.read_parquet(CURRENT)

    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=reference_df, current_data=current_df)
    report.save_html("drift_report.html")

    if should_block(report.as_dict()):
        print("drift gate: BLOCK")
        return 1

    print("drift gate: passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
