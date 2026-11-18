# Our check says fraud recall is 0.97, finance says 0.55

## Problem Description

Finance says fraud recall fell to 0.55, but our Evidently check shows 0.97 and never fails (`monitoring/notes.md`). Fix `monitoring/perf_check.py` so it measures what finance measures and fails the job when fraud recall is below 0.75. Evidently isn't installed here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: monitoring/perf_check.py ===============
import pandas as pd
from evidently import Report
from evidently.presets import ClassificationPreset

ref = pd.read_parquet("data/validation_2026q2.parquet")
cur = pd.read_parquet("data/matured_last_month.parquet")

report = Report([ClassificationPreset()], include_tests=True)
result = report.run(reference_data=ref, current_data=cur)
result.save_html("perf.html")
print("done")

=============== FILE: data/columns.md ===============
Both files have the same columns:
- `chargeback`: the outcome, either "fraud" or "ok" (strings), known 60 days after the transaction
- `score`: the model's fraud probability, 0-1
- `amount`, `merchant_category`, `country`: inputs
There is no predicted-label column. The business flags a transaction when score >= 0.35.

=============== FILE: monitoring/notes.md ===============
Finance counts fraud recall (share of real fraud we flagged) at 0.55 for last month, down
from 0.81. perf.html shows recall 0.97 and nothing ever fails. We need the job to fail
when fraud recall is below 0.75.
