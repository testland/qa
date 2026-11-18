# The drift job pages on-call every day

## Problem Description

Our drift job pages on-call every day (`monitoring/alerts.md`) and the team wants to mute it. Work out which alerts are false and fix `monitoring/drift_job.py` so real drift still pages. Evidently isn't installed here, so you can't run it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: monitoring/drift_job.py ===============
import pandas as pd
from evidently import Report
from evidently.presets import DataDriftPreset

from alerts import page_oncall

ref = pd.read_parquet("data/reference.parquet")   # 50k rows sampled from training data
cur = pd.read_parquet("data/last_24h.parquet")    # about 80k rows of yesterday's traffic

report = Report([DataDriftPreset()], include_tests=True)
result = report.run(reference_data=ref, current_data=cur)
result.save_html("drift.html")

failed = [t for t in result.dict()["tests"] if t.get("status") in ("FAIL", "ERROR")]
if failed:
    page_oncall(f"{len(failed)} drift tests failed, see drift.html")

=============== FILE: data/schema.md ===============
| column | type | meaning |
|---|---|---|
| customer_id | int64 | sequential account number, new accounts get the next number |
| region_code | int64 | sales region 1-14 (a code, not a quantity) |
| basket_value | float64 | order value in EUR |
| n_items | int64 | items in the basket |
| channel | string | web, app or store |
| fraud_score | float64 | model output, 0-1 |

=============== FILE: monitoring/alerts.md ===============
On-call was paged every day for the last 10 days. Drifted columns per page:
- customer_id: 10 of 10 pages
- region_code: 6 of 10 pages (distance-based method)
- basket_value: 1 of 10 (Black Friday)
- fraud_score: 1 of 10 (same day)
The team wants to mute the job.
