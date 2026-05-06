---
name: deepchecks-tests
description: Run Deepchecks suites (data integrity, train-test validation, model evaluation) on tabular / NLP / vision data + models. Pass `result.passed_conditions()` to CI to gate on regressions; the same checks run during research, CI, and production monitoring per the Deepchecks lifecycle posture.
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - deepchecks
  - ml-testing
  - data-validation
  - train-test-split
  - model-evaluation
---

# deepchecks-tests

Deepchecks is *"a holistic open-source solution for all of your AI &
ML validation needs"* per the [Deepchecks welcome]. Validates **data
integrity, train-test splits, model evaluation, end-to-end model
development from research through production**.

## When to use

- Pre-training: validate data integrity + train-test leakage.
- Pre-deployment: model evaluation suite as merge gate.
- Production monitoring: same suite re-run on production samples
  to detect drift.

## Step 1 — Install

```bash
pip install deepchecks
```

Per the [Deepchecks welcome] page.

## Step 2 — Wrap data

For tabular models:

```python
from deepchecks.tabular import Dataset

train_ds = Dataset(
    train_df,
    label="target",
    cat_features=CATEGORICAL_COLUMNS,
)
test_ds = Dataset(
    test_df,
    label="target",
    cat_features=CATEGORICAL_COLUMNS,
)
```

`cat_features` matters for distribution checks. The Vision and NLP
APIs differ — see the [Deepchecks welcome] section linking
quickstarts for each data type.

## Step 3 — Run the data integrity suite

```python
from deepchecks.tabular.suites import data_integrity

integrity = data_integrity()
result = integrity.run(train_ds)
result.save_as_html("data_integrity.html")
```

Catches: duplicate rows, missing values, mixed types, conflicting
labels, single-value features, string mismatches.

## Step 4 — Run the train-test validation suite

```python
from deepchecks.tabular.suites import train_test_validation

validation = train_test_validation()
result = validation.run(train_ds, test_ds)
result.save_as_html("train_test_validation.html")
```

Catches: target drift, feature drift, train-test data leakage, label
imbalance, dataset size mismatch.

## Step 5 — Run the model evaluation suite

```python
from deepchecks.tabular.suites import model_evaluation

evaluation = model_evaluation()
result = evaluation.run(train_ds, test_ds, model)
result.save_as_html("model_evaluation.html")

if not result.passed_conditions():
    raise SystemExit("Deepchecks model evaluation failed")
```

Catches: performance regression vs baseline, weak segments, calibration
issues, prediction drift between train and test.

## Step 6 — Per-check thresholds

```python
from deepchecks.tabular.checks import FeatureDrift

check = FeatureDrift().add_condition_drift_score_less_than(
    max_allowed_categorical_score=0.2,
    max_allowed_numeric_score=0.1,
)
result = check.run(train_ds, test_ds)

if not result.passed_conditions():
    print(result.value)
    raise SystemExit("FeatureDrift failed threshold")
```

Each check has `add_condition_*` methods; chain them for per-check
gating.

## Step 7 — CI integration

```yaml
- name: Deepchecks suite
  run: |
    python ml/deepchecks_suite.py
- name: Upload Deepchecks reports
  uses: actions/upload-artifact@v4
  with:
    name: deepchecks-reports
    path: "*.html"
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `cat_features` | All categorical checks misfire | Always specify (Step 2) |
| Skip `data_integrity` suite | Train on leaky / dup-heavy data | Run before `train_test_validation` (Step 3) |
| Block CI on every check | Hundreds of warning conditions; team disables | Define per-check thresholds (Step 6); gate Critical only |
| Re-run on the SAME test split each PR | Fixed split → fixed results; no drift detection | Use rolling/cross-validation splits |
| Reuse training data as "current" for production monitoring | Always passes drift; blind to real drift | Use real production samples |

## Limitations

- Deepchecks' "default conditions" are tuned for textbook ML; they
  may be too strict for real-world skewed data. Tune via
  `add_condition_*` methods (Step 6).
- Vision suite memory footprint: large image datasets need batched
  runs. See the [Deepchecks welcome] vision quickstart link.

## References

- [Deepchecks welcome] — overview, install, suite/check architecture,
  per-data-type quickstart links

[Deepchecks welcome]: https://docs.deepchecks.com/stable/getting-started/welcome.html
