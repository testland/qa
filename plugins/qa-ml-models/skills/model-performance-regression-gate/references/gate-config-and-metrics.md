# Gate config and metric reference

Deep detail for model-performance-regression-gate: the externalised YAML
threshold config plus its loader, and the per-metric scikit-learn API notes.
The runnable gate itself stays in SKILL.md; this file holds the tunables and
the full metric signatures.

## YAML threshold config

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

Load it into the same `TOLERANCES` and `HIGHER_IS_BETTER` structures the gate
uses in Step 4:

```python
import yaml

with open("config/gate_thresholds.yaml") as f:
    cfg = yaml.safe_load(f)

TOLERANCES = {k: v["tolerance"] for k, v in cfg["metrics"].items()}
HIGHER_IS_BETTER = {k for k, v in cfg["metrics"].items() if v["higher_is_better"]}
```

## Per-metric scikit-learn signatures

Per [scikit-learn model evaluation docs]:
- `accuracy_score(y_true, y_pred)` - higher better.
- `f1_score(y_true, y_pred, average='weighted')` - higher better.
- `roc_auc_score(y_true, y_score)` requires probability estimates; for
  multiclass use `average='weighted', multi_class='ovr'`.
- `root_mean_squared_error(y_true, y_pred)` (regression) is in target units,
  lower better, so its tolerance direction is inverted in Step 4.

[scikit-learn model evaluation docs]: https://scikit-learn.org/stable/modules/model_evaluation.html
