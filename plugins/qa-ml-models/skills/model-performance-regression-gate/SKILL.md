---
name: model-performance-regression-gate
description: "Computes held-out metrics (accuracy, F1, AUC, RMSE) for a retrained model and compares them against the current production model, failing promotion when any metric regresses beyond a configured tolerance. Adds per-segment checks via Deepchecks WeakSegmentsPerformance so a model that improves globally but regresses on a key slice is still blocked. Use when a retrained model is a candidate for promotion and the CI pipeline must enforce a per-metric pass/fail gate before the artifact is pushed to the model registry."
metadata:
  keywords: "model-regression, ci-gate, model-promotion, performance-comparison, ml-testing, deepchecks, scikit-learn"
---

# model-performance-regression-gate

A CI gate that blocks model promotion when a retrained model regresses on
held-out metrics vs the current production model beyond a configured tolerance.
Covers global metrics (accuracy, F1, AUC, RMSE) and per-segment checks so a
model that improves in aggregate but regresses on a key slice is still blocked.

Differentiation from neighbors:
- `deepchecks-tests` runs the full model-evaluation suite but does not
  compare a candidate against a production model or enforce per-metric
  tolerances as a promotion gate.
- `evidently-monitoring` detects data and target drift in production traffic;
  it does not perform a pairwise metric comparison between two model versions
  at deploy time.
- This skill is scoped to the promotion-gating decision: candidate vs.
  production, per metric, per segment, with configurable tolerances.

## When to use

Invoke in a CI/CD pipeline step immediately after retraining, before the
model artifact is registered or deployed. The step receives the held-out test
set, the candidate model, and the production model (loaded from the registry).
It exits non-zero when any metric degresses beyond tolerance.

## Step 1 - Install dependencies

```bash
pip install deepchecks scikit-learn joblib
```

Deepchecks is the primary framework for segment-level checks (per
[Deepchecks model evaluation docs]). scikit-learn supplies the scalar
metric functions (per [scikit-learn model evaluation docs]).

## Step 2 - Load models and held-out data

```python
import joblib
import pandas as pd
from deepchecks.tabular import Dataset

# Load artifacts
prod_model = joblib.load("models/production.pkl")
candidate_model = joblib.load("models/candidate.pkl")

test_df = pd.read_parquet("data/held_out_test.parquet")

# Deepchecks Dataset wraps the DataFrame with schema metadata.
# cat_features must be specified for segment checks to work correctly.
# Per deepchecks-tests skill: omitting cat_features causes distribution
# checks to misfire.
test_ds = Dataset(
    test_df,
    label="target",
    cat_features=["region", "plan_tier"],
)
```

## Step 3 - Compute global metrics for both models

Use scikit-learn metric functions directly so the gate has explicit,
inspectable numeric values rather than relying on internal scorer defaults.

Per [scikit-learn model evaluation docs]:
- `accuracy_score(y_true, y_pred)` returns fraction of correct predictions
  (range 0-1, higher better).
- `f1_score(y_true, y_pred, average='weighted')` returns weighted harmonic
  mean of precision and recall (range 0-1, higher better).
- `roc_auc_score(y_true, y_score)` requires probability estimates; for
  multiclass use `average='weighted', multi_class='ovr'`.
- `root_mean_squared_error(y_true, y_pred)` (regression) is in target units
  (lower better).

```python
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    roc_auc_score,
    root_mean_squared_error,
)

y_true = test_df["target"].values
X_test = test_df.drop(columns=["target"])

# Classification gate (swap for regression block below as needed)
prod_preds = prod_model.predict(X_test)
cand_preds = candidate_model.predict(X_test)
prod_proba = prod_model.predict_proba(X_test)[:, 1]
cand_proba = candidate_model.predict_proba(X_test)[:, 1]

metrics = {
    "accuracy": (
        accuracy_score(y_true, prod_preds),
        accuracy_score(y_true, cand_preds),
    ),
    "f1_weighted": (
        f1_score(y_true, prod_preds, average="weighted"),
        f1_score(y_true, cand_preds, average="weighted"),
    ),
    "roc_auc": (
        roc_auc_score(y_true, prod_proba),
        roc_auc_score(y_true, cand_proba),
    ),
}

# Regression variant (replace classification block above)
# metrics = {
#     "rmse": (
#         root_mean_squared_error(y_true, prod_model.predict(X_test)),
#         root_mean_squared_error(y_true, candidate_model.predict(X_test)),
#     ),
# }
```

## Step 4 - Apply per-metric tolerances and build the gate

Tolerances are configured as a dict so they can be loaded from a YAML file
without changing code. For higher-is-better metrics the candidate must not
drop by more than `tolerance` from production. For lower-is-better metrics
(RMSE) the candidate must not rise by more than `tolerance * prod_value`.

```python
import sys

# Load from config/gate_thresholds.yaml in practice; hardcoded here for clarity.
TOLERANCES = {
    "accuracy":    0.01,   # candidate may drop at most 1 pp
    "f1_weighted": 0.02,   # candidate may drop at most 2 pp
    "roc_auc":     0.01,   # candidate may drop at most 1 pp
    # "rmse":      0.05,   # candidate RMSE may rise at most 5 % of prod value
}

HIGHER_IS_BETTER = {"accuracy", "f1_weighted", "roc_auc"}

failures = []

for metric, (prod_val, cand_val) in metrics.items():
    tol = TOLERANCES[metric]
    if metric in HIGHER_IS_BETTER:
        regressed = (prod_val - cand_val) > tol
    else:
        regressed = (cand_val - prod_val) > tol * prod_val

    status = "FAIL" if regressed else "PASS"
    print(f"  {metric}: prod={prod_val:.4f}  cand={cand_val:.4f}  [{status}]")
    if regressed:
        failures.append(
            f"{metric}: candidate {cand_val:.4f} regressed vs prod {prod_val:.4f}"
            f" (tolerance {tol})"
        )

if failures:
    print("\nGate FAILED:")
    for f in failures:
        print(f"  {f}")
    sys.exit(1)

print("\nGlobal metric gate PASSED.")
```

## Step 5 - Per-segment check with Deepchecks WeakSegmentsPerformance

A model can improve globally while silently regressing on a demographic or
business-critical slice. `WeakSegmentsPerformance` from Deepchecks
identifies the data segments where performance is lowest and can be gated
with `add_condition_segments_relative_performance_greater_than`.

Per [Deepchecks model evaluation docs], `WeakSegmentsPerformance`:
- calculates per-sample loss (log-loss for classification, MSE for regression),
- selects high-importance feature pairs,
- trains simple tree models to find segments with concentrated errors,
- returns ranked weak segments with performance scores and data fractions.

```python
from deepchecks.tabular.checks import WeakSegmentsPerformance

seg_check = WeakSegmentsPerformance(
    segment_minimum_size_ratio=0.05,  # ignore segments smaller than 5 %
)
# Gate: no segment may perform more than 15 % below the dataset average.
seg_check.add_condition_segments_relative_performance_greater_than(
    max_ratio_change=0.15
)

seg_result = seg_check.run(test_ds, candidate_model)
seg_result.save_as_html("segment_report_candidate.html")

if not seg_result.passed_conditions():
    print("Segment gate FAILED: candidate regresses on at least one slice.")
    sys.exit(1)

print("Segment gate PASSED.")
```

Per [Deepchecks hierarchy docs], `passed_conditions()` returns `False`
when any condition with `ConditionCategory.FAIL` is triggered; `WARN`
conditions do not block.

## Step 6 - Deepchecks TrainTestPerformance as secondary confirmation

Use `TrainTestPerformance` as a second signal to detect train-test
overfitting in the candidate that would not appear in the production
comparison (the production model's train set is unavailable).
Per [Deepchecks model evaluation docs], the condition
`add_condition_train_test_relative_degradation_less_than` fails when
test performance drops more than the given fraction vs train performance.

```python
from deepchecks.tabular.checks import TrainTestPerformance
from deepchecks.tabular import Dataset

train_df = pd.read_parquet("data/train.parquet")
train_ds = Dataset(train_df, label="target", cat_features=["region", "plan_tier"])

ttp_check = TrainTestPerformance(
    scorers=["f1_macro", "recall_per_class", "precision_per_class"]
)
ttp_check.add_condition_train_test_relative_degradation_less_than(0.15)

ttp_result = ttp_check.run(train_ds, test_ds, candidate_model)
ttp_result.save_as_html("train_test_performance.html")

if not ttp_result.passed_conditions():
    print("Train-test degradation gate FAILED.")
    sys.exit(1)

print("Train-test degradation gate PASSED.")
```

## Step 7 - CI integration (GitHub Actions)

```yaml
jobs:
  model-regression-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pip install deepchecks scikit-learn joblib

      - name: Download model artifacts
        run: |
          aws s3 cp s3://my-bucket/models/production.pkl models/production.pkl
          aws s3 cp s3://my-bucket/models/candidate.pkl  models/candidate.pkl

      - name: Run regression gate
        run: python ml/regression_gate.py

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: model-regression-reports
          path: "*.html"
```

The step exits non-zero on any gate failure, blocking promotion. The
`if: always()` on the artifact upload ensures reports are available for
triage even when the gate fails.

## Step 8 - YAML threshold config (optional)

Externalise tolerances so non-engineers can tune them via a PR rather than
editing Python:

```yaml
# config/gate_thresholds.yaml
metrics:
  accuracy:
    tolerance: 0.01
    higher_is_better: true
  f1_weighted:
    tolerance: 0.02
    higher_is_better: true
  roc_auc:
    tolerance: 0.01
    higher_is_better: true
segment:
  max_ratio_change: 0.15
  min_segment_size_ratio: 0.05
```

```python
import yaml

with open("config/gate_thresholds.yaml") as f:
    cfg = yaml.safe_load(f)

TOLERANCES = {k: v["tolerance"] for k, v in cfg["metrics"].items()}
HIGHER_IS_BETTER = {k for k, v in cfg["metrics"].items() if v["higher_is_better"]}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use training data as the held-out set | Gate always passes; no real signal | Use a held-out split never seen during training (Step 2) |
| Single global metric as the only gate | Model improves on majority class, regresses on minority | Add per-segment check (Step 5) |
| Hard-code thresholds in Python | Non-engineers cannot tune without a code change | Externalise to YAML config (Step 8) |
| Skip `cat_features` in Dataset | Deepchecks segment search misfires on categorical columns | Always specify `cat_features` (Step 2) |
| Block on `WARN` conditions | High false-positive rate; team disables gate | Gate on `FAIL` only; `passed_conditions()` already does this per [Deepchecks hierarchy docs] |
| Compare candidate to an untested prod model | Gate catches nothing if prod is also broken | Validate prod model on the same held-out set first (Step 3) |

## Limitations

- `WeakSegmentsPerformance` requires the held-out set to be large enough
  to produce segments above `segment_minimum_size_ratio`. On very small
  test sets (under ~500 rows) the segment check may find no segments and
  return no conditions. Verify `seg_result.value["weak_segments_list"]`
  is non-empty.
- `roc_auc_score` requires probability estimates. Models that expose only
  `predict` (e.g., some sklearn wrappers without `predict_proba`) must use
  `f1_score` or `accuracy_score` as AUC substitutes.
- Deepchecks default scorers for `TrainTestPerformance` are task-type
  specific (classification: F1, Precision, Recall; regression: Neg RMSE,
  Neg MAE, R2). Per [Deepchecks model evaluation docs], pass explicit
  `scorers=` to match the metrics your gate cares about.

## References

- [Deepchecks model evaluation docs]: model evaluation check index,
  `WeakSegmentsPerformance`, `TrainTestPerformance`, `SingleDatasetPerformance`
  conditions API
- [Deepchecks hierarchy docs]: checks, conditions, suites, `passed_conditions()`
- [scikit-learn model evaluation docs]: `accuracy_score`, `f1_score`,
  `roc_auc_score`, `root_mean_squared_error` function signatures and scorer
  string names

[Deepchecks model evaluation docs]: https://docs.deepchecks.com/stable/tabular/auto_checks/model_evaluation/
[Deepchecks hierarchy docs]: https://docs.deepchecks.com/stable/general/concepts/deepchecks_hierarchy.html
[scikit-learn model evaluation docs]: https://scikit-learn.org/stable/modules/model_evaluation.html
