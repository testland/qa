import pandas as pd
from evidently import Report
from evidently.presets import ClassificationPreset

ref = pd.read_parquet("data/validation_2026q2.parquet")
cur = pd.read_parquet("data/matured_last_month.parquet")

report = Report([ClassificationPreset()], include_tests=True)
result = report.run(reference_data=ref, current_data=cur)
result.save_html("perf.html")
print("done")
