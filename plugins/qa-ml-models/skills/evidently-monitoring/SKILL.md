---
name: evidently-monitoring
description: "Use Evidently OSS (100+ evaluation metrics, declarative testing API) to detect data drift, target drift, and model-performance regression, wired into CI as a gate (a Report run with include_tests) and into production monitoring as a continuous check; reports as HTML + JSON for both human review and pipeline assertions. Use when you need a drift or quality gate, or a scheduled monitoring job, for a tabular ML model. Built on the Evidently API specifically: for DeepChecks-based validation suites use deepchecks-tests instead."
metadata:
  keywords: "evidently, data-drift, model-monitoring, drift-detection, production-monitoring"
---

# evidently-monitoring

Evidently is *"an open-source Python library with over 40+ million
downloads. It provides 100+ evaluation metrics, a declarative testing
API, and a lightweight visual interface"* per [Evidently docs].

## When to use

- Pre-deployment gate: assert no data/target drift between
  candidate-model evaluation set and the production reference.
- Production monitoring: scheduled job comparing yesterday's traffic
  vs the reference window.
- Triage tool: when a model misbehaves in prod, run an Evidently
  Report comparing the bad period to a known-good window.

## Step 1 - Install

```bash
pip install evidently
```

See the canonical install page at
https://docs.evidentlyai.com/docs/setup/installation for the current
install options (`pip install evidently`, plus the `evidently[llm]` extra).

## Step 2 - Reference + current datasets

The standard pattern compares two datasets:

- **Reference** - known-good baseline (e.g., training data, last
  validated production window).
- **Current** - what you're checking (candidate model eval set, or
  current production traffic).

```python
import pandas as pd

reference_df = pd.read_parquet("reference.parquet")
current_df = pd.read_parquet("current.parquet")
```

## Step 3 - Run a drift Report

```python
from evidently import Report
from evidently.presets import DataDriftPreset

# The current API takes the preset list positionally; run() with keyword
# args is unambiguous about which dataset is which (per [Evidently Report]).
report = Report([DataDriftPreset()])
my_eval = report.run(reference_data=reference_df, current_data=current_df)
my_eval.save_html("drift_report.html")
```

Result: HTML dashboard + structured JSON. Per [Evidently docs], the
preset bundles per-feature drift detection with sane defaults.

## Step 4 - Gate CI on the drift tests

In the current Evidently API there is no separate `TestSuite` class. You
enable per-column pass/fail **tests** by passing `include_tests=True` to the
`Report`, then read each test's status from the result, per
[Evidently Report]:

```python
from evidently import Report
from evidently.presets import DataDriftPreset

# include_tests=True turns the preset's per-column drift metrics into
# pass/fail tests alongside the metrics.
report = Report([DataDriftPreset()], include_tests=True)
my_eval = report.run(reference_data=reference_df, current_data=current_df)

# .dict() exposes top-level "metrics" and "tests" only - there is NO
# top-level "status" key. Gate on any test that did not pass.
result = my_eval.dict()
failed = [t for t in result["tests"] if t.get("status") in ("FAIL", "ERROR")]
if failed:
    raise SystemExit(
        f"Evidently drift gate failed: {len(failed)} test(s); see drift_report.html"
    )
```

Evidently's drift detection supports several statistical methods (`psi`,
`wasserstein`, `ks`, `chisquare`, `jensenshannon`); PSI is conventional for
tabular production drift. Configure the method and threshold per column on
the preset or the dataset's data definition, per [Evidently drift preset].

## Step 5 - Model-performance presets

```python
from evidently.presets import RegressionPreset, ClassificationPreset

# Regression
report = Report([RegressionPreset()])
report.run(reference_data=ref, current_data=cur).save_html("regression.html")

# Classification
report = Report([ClassificationPreset()])
report.run(reference_data=ref, current_data=cur).save_html("classification.html")
```

Requires both `prediction` and `target` columns in both DataFrames.

## Step 6 - Schedule in production

```python
# Daily monitoring job
import datetime
from pathlib import Path

today = datetime.date.today().isoformat()
current_df = load_production_window(start=today, days=1)
reference_df = load_reference_window()

report = Report([DataDriftPreset()], include_tests=True)
result = report.run(reference_data=reference_df, current_data=current_df)
result.save_html(Path(f"monitoring/{today}.html"))

if any(t.get("status") in ("FAIL", "ERROR") for t in result.dict()["tests"]):
    notify_oncall(f"Data drift detected on {today}")
```

Pair with a scheduler (Airflow / Prefect / cron / Argo Workflows).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use yesterday as reference (rolling window only) | Slow drifts go undetected (model degrades 1% per day for 100 days = 100% drift) | Pin a stable reference (Step 2) |
| Run only on training data | Training data is curated; never reflects real production distribution | Use real production samples (Step 6) |
| Default thresholds for all metrics | Defaults are textbook; production tolerance differs | Tune per-feature thresholds (Step 4) |
| Block deploy on every drift | High-traffic production shifts daily; team disables monitor | Severity tiers: critical drift blocks; minor drift alerts |
| Skip target/prediction drift | Concept drift (inputs stable, output behavior changed) goes undetected | Include the target/prediction column in the drift check (Steps 3-4) |

## Limitations

- 100+ metrics doesn't mean every domain. Healthcare/finance fairness
  metrics often need pairing with `fairlearn-fairness` skill.
- Memory: full preset on millions of rows can OOM. Sample to
  100k - 1M before passing.

## References

- [Evidently docs] - library overview, presets, install snippet
- [Evidently Report] - Report construction, `include_tests`, `run()`, and
  the `.dict()` result shape (top-level `metrics` + `tests`, per-test status)
- [Evidently drift preset] - DataDriftPreset and per-column drift method
  configuration
- The [Evidently docs] llms.txt index lists current canonical per-preset
  documentation: https://docs.evidentlyai.com/llms.txt

[Evidently docs]: https://docs.evidentlyai.com/
[Evidently Report]: https://docs.evidentlyai.com/docs/library/report
[Evidently drift preset]: https://docs.evidentlyai.com/metrics/preset_data_drift
