---
name: giskard-tests
description: "Test ML models with Giskard's scan() vulnerability detector + test catalog (performance, robustness, fairness, data leakage, ethical issues) for tabular and NLP models. Wrap a prediction function in giskard.Model + a DataFrame in giskard.Dataset; emit test suites that pass/fail in CI."
type: skill
archetype: S1
rating: 23
d6: 4
keywords:
  - giskard
  - ml-testing
  - model-vulnerabilities
  - fairness-testing
  - tabular-models
---

# giskard-tests

Giskard wraps any prediction function and DataFrame, then runs a
`scan()` that surfaces *"performance biases, unrobustness, data
leakage, stochasticity, underconfidence, ethical issues"* per the
[Giskard tabular quickstart].

## When to use

- Pre-deployment model audit (fairness + robustness scan).
- Pre-merge gate after a feature-engineering or hyperparameter
  change — re-run scan, fail PR if new vulnerabilities surface.
- Generating an initial test suite for a model with no existing tests.

## Step 1 — Install

```bash
pip install giskard --upgrade
```

Per the [Giskard tabular quickstart].

## Step 2 — Wrap the dataset

```python
from giskard import Dataset

giskard_dataset = Dataset(
    df=raw_data,
    target=TARGET_COLUMN,
    name="Titanic dataset",
    cat_columns=CATEGORICAL_COLUMNS,
)
```

`cat_columns` matters — Giskard treats categoricals differently for
slicing + drift detection.

## Step 3 — Wrap the model

```python
from giskard import Model
import numpy as np
import pandas as pd

def prediction_function(df: pd.DataFrame) -> np.ndarray:
    preprocessed_df = preprocessing_function(df)
    return classifier.predict_proba(preprocessed_df)

giskard_model = Model(
    model=prediction_function,
    model_type="classification",
    name="Titanic model",
    classification_labels=classifier.classes_,
    feature_names=FEATURE_NAMES,
)
```

The `prediction_function` returns probabilities (not class labels)
for classification — required by Giskard's calibration checks.

## Step 4 — Scan for vulnerabilities

```python
from giskard import scan

results = scan(giskard_model, giskard_dataset)
results.to_html("scan_report.html")
```

Per the [Giskard tabular quickstart], scan covers categories:
performance bias, unrobustness, data leakage, stochasticity,
underconfidence, ethical issues. HTML report is artifact-friendly
for CI.

## Step 5 — Generate a test suite from scan

```python
test_suite = results.generate_test_suite("My first test suite")
suite_results = test_suite.run()

if not suite_results.passed:
    raise SystemExit("Giskard test suite failed; see report")
```

## Step 6 — Add specific tests from catalog

```python
from giskard import testing

test_suite.add_test(
    testing.test_f1(
        model=giskard_model,
        dataset=giskard_dataset,
        threshold=0.7,
    )
)

# Slicing test: F1 must hold on a subset
female_slice = giskard_dataset.slice(lambda df: df[df.sex == "female"])
test_suite.add_test(
    testing.test_f1(
        model=giskard_model,
        dataset=female_slice,
        threshold=0.65,
    )
)

test_suite.run()
```

Catalog includes `test_f1`, `test_accuracy`, `test_recall`,
`test_drift_*`, metamorphic transformations. Reference the
[Giskard tabular quickstart] for the current full list.

## Step 7 — CI integration

```yaml
- name: Giskard scan
  run: |
    python ml/giskard_scan.py
    # Script raises SystemExit on failure
- name: Upload Giskard report
  uses: actions/upload-artifact@v4
  with:
    name: giskard-report
    path: scan_report.html
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `cat_columns` parameter | Categorical features treated as numeric; bogus drift | Always pass `cat_columns` (Step 2) |
| Wrap a `predict()` (classes) instead of `predict_proba()` (probs) | Calibration tests cannot run | Use `predict_proba` for classification (Step 3) |
| Run scan once, don't add to suite | One-off finding never re-checked | Generate suite from scan (Step 5); CI gates re-run |
| Block CI on every minor scan finding | Noise; team disables Giskard | Set per-test threshold; gate on critical+major only |
| Reuse training dataset for scan | False sense of robustness; scan needs unseen data | Use held-out test split |

## Limitations

- Giskard's NLP scan covers fewer languages than tabular. Verify
  language support in the [Giskard tabular quickstart] sister
  pages.
- `scan()` is non-deterministic with stochastic models; pin
  `random_state` in the model and Giskard config for reproducible CI.

## References

- [Giskard tabular quickstart] — Model/Dataset wrapping, scan, suite generation, test catalog

[Giskard tabular quickstart]: https://legacy-docs.giskard.ai/en/latest/getting_started/quickstart/quickstart_tabular.html
