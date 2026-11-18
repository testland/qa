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
