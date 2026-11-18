# A drift alert that fires almost every day

## Problem Description

The drift alert in `monitoring/drift_job.py` pages someone almost every day (`docs/oncall.md`, `data/README.md`). Find out why and change the job so it alerts on drift that matters.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: monitoring/drift_job.py ===============
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

from alerts import page_oncall

reference = pd.read_parquet("data/reference.parquet")   # ~120k rows, last quarter
current = pd.read_parquet("data/today.parquet")         # ~40k rows, one day

# KS everywhere: a proper statistical test instead of the default "distances"
report = Report(metrics=[DataDriftPreset(stattest="ks", stattest_threshold=0.05)])
report.run(reference_data=reference, current_data=current)
result = report.as_dict()

drift = result["metrics"][0]["result"]
if drift["number_of_drifted_columns"] > 0:
    page_oncall(f"DATA DRIFT: {drift['number_of_drifted_columns']} of {drift['number_of_columns']} columns")

=============== FILE: docs/oncall.md ===============
# Drift alert

- The alert fired on 27 of the last 30 days, almost always on 9 to 11 of the 12 features.
- Model quality on labelled data (7-day lag) is flat: AUC 0.91 every week.
- Before March, when we forced KS for all columns, the job alerted about 3 times a quarter.
- Nobody looks at the alert any more.

=============== FILE: data/README.md ===============
reference.parquet: 120,000 rows, 12 features (8 numerical, 4 categorical), last quarter.
today.parquet: 30,000 to 45,000 rows per day.
