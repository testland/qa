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
