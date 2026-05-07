---
name: evidently-monitoring
description: "Use Evidently OSS (100+ evaluation metrics, declarative testing API) to detect data drift, target drift, and model performance regression — wired into CI as a gate and into production monitoring as a continuous check. Reports as HTML + JSON for both human review and pipeline assertions."
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - evidently
  - data-drift
  - model-monitoring
  - drift-detection
  - production-monitoring
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

## Step 1 — Install

```bash
pip install evidently
```

See the canonical install snippet at
https://docs.evidentlyai.com/snippets/install_evidently_oss for the
current pinned version constraints.

## Step 2 — Reference + current datasets

The standard pattern compares two datasets:

- **Reference** — known-good baseline (e.g., training data, last
  validated production window).
- **Current** — what you're checking (candidate model eval set, or
  current production traffic).

```python
import pandas as pd

reference_df = pd.read_parquet("reference.parquet")
current_df = pd.read_parquet("current.parquet")
```

## Step 3 — Run a drift Report

```python
from evidently import Report
from evidently.presets import DataDriftPreset

report = Report(metrics=[DataDriftPreset()])
my_eval = report.run(reference_data=reference_df, current_data=current_df)
my_eval.save_html("drift_report.html")
```

Result: HTML dashboard + structured JSON. Per [Evidently docs], the
preset bundles per-feature drift detection with sane defaults.

## Step 4 — Run a TestSuite for CI gating

```python
from evidently import Report
from evidently.presets import DataDriftPreset
from evidently.tests import TestColumnDrift

report = Report(
    tests=[
        DataDriftPreset(),
        TestColumnDrift(column="target", stattest="psi", stattest_threshold=0.2),
    ]
)
result = report.run(reference_data=reference_df, current_data=current_df)

if result.dict()["status"] == "FAIL":
    raise SystemExit("Evidently TestSuite failed; see drift_report.html")
```

`stattest` options include `psi`, `wasserstein`, `ks`, `chisquare`,
`jensenshannon` — pick by data type. PSI is conventional for tabular
production drift.

## Step 5 — Model-performance presets

```python
from evidently.presets import RegressionPreset, ClassificationPreset

# Regression
report = Report(metrics=[RegressionPreset()])
report.run(reference_data=ref, current_data=cur).save_html("regression.html")

# Classification
report = Report(metrics=[ClassificationPreset()])
report.run(reference_data=ref, current_data=cur).save_html("classification.html")
```

Requires both `prediction` and `target` columns in both DataFrames.

## Step 6 — Schedule in production

```python
# Daily monitoring job
import datetime
from pathlib import Path

today = datetime.date.today().isoformat()
current_df = load_production_window(start=today, days=1)
reference_df = load_reference_window()

report = Report(metrics=[DataDriftPreset()])
result = report.run(reference_data=reference_df, current_data=current_df)
result.save_html(Path(f"monitoring/{today}.html"))

if result.dict()["status"] == "FAIL":
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
| Skip target drift | Concept drift (input stable, output behavior changed) goes undetected | Always include `TestColumnDrift(column="target")` (Step 4) |

## Limitations

- 100+ metrics doesn't mean every domain. Healthcare/finance fairness
  metrics often need pairing with `fairlearn-fairness` skill.
- Memory: full preset on millions of rows can OOM. Sample to
  100k–1M before passing.

## References

- [Evidently docs] — library overview, presets, TestSuite, install
  snippet
- Per the [Evidently docs] llms.txt index for current canonical
  per-preset documentation: https://docs.evidentlyai.com/llms.txt

[Evidently docs]: https://docs.evidentlyai.com/
