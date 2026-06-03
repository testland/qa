---
name: alibi-explainability
description: "Use Alibi Explain to generate model explanations - Anchors, Integrated Gradients, Kernel/Tree SHAP, ALE, Counterfactual Instances. Wires explainer.fit + explainer.explain into model-evaluation pipelines so that every flagged prediction ships with a \"why\" record auditors can reason about."
type: skill
rating: 22
d6: 4
keywords:
  - alibi
  - explainability
  - interpretability
  - counterfactual
  - shap
  - integrated-gradients
---

# alibi-explainability

Alibi Explain provides explanation algorithms answering: *"How do
predictions change with feature inputs? Which features matter for a
prediction? What minimal changes would alter a prediction? How does
each feature contribute to predictions?"* per the [Alibi Explain docs].

## When to use

- Compliance / regulator inquiry: "explain this denied loan
  prediction" - generate counterfactual + per-feature attribution.
- Model debugging: a single instance got the wrong answer; explain
  *why*.
- High-risk system audit (EU AI Act Annex III): every prediction
  ships with a stored explanation record.

## Step 1 - Install

```bash
pip install alibi
```

Per the [Alibi Explain docs].

## Step 2 - Pick the right explainer category

Per the [Alibi Explain docs]:

| Category | Explainers | When |
|---|---|---|
| Global feature attribution | Accumulated Local Effects (ALE), Partial Dependence | "Across the whole input space, how does feature X drive output?" |
| Local necessary features | Anchors, Pertinent Positives | "What minimal feature subset locks in this prediction?" |
| Local feature attribution | Integrated Gradients, Kernel SHAP, Tree SHAP | "What did each feature contribute to *this* prediction?" |
| Counterfactual | Counterfactual Instances, CEM, CFProto, CounterfactualRL | "What minimal change flips this prediction?" |

## Step 3 - The two-method interface

Every Alibi explainer follows the same pattern:

```python
explainer.fit(X_train)        # Some explainers — preparation phase
explanation = explainer.explain(instance)
print(explanation.data)       # Per-explainer schema
```

Per the [Alibi Explain docs] Explainer Interface section.

## Step 4 - Anchors example (tabular)

```python
from alibi.explainers import AnchorTabular

predict_fn = lambda x: classifier.predict(x)
explainer = AnchorTabular(
    predict_fn,
    feature_names=FEATURE_NAMES,
    categorical_names=CATEGORICAL_INDEX,
)
explainer.fit(X_train)

explanation = explainer.explain(X_test[0])
print("Anchor: %s" % (" AND ".join(explanation.anchor)))
print("Precision: %.2f" % explanation.precision)
print("Coverage: %.2f" % explanation.coverage)
```

Anchors return a minimal feature subset such that the prediction
holds with `precision` confidence over `coverage` of the input space.

## Step 5 - Counterfactual example

```python
from alibi.explainers import CounterfactualProto

cf = CounterfactualProto(
    predict_fn,
    shape=X_train[0:1].shape,
    use_kdtree=True,
    theta=10.,
)
cf.fit(X_train)

explanation = cf.explain(X_test[0:1])
print("Counterfactual: %s" % explanation.cf["X"])
print("Original class: %d, CF class: %d" % (
    explanation.orig_class, explanation.cf["class"]
))
```

Counterfactual = "the closest input that flips the prediction" - 
auditor-friendly format.

## Step 6 - Persist explanations as audit records

```python
import json
from pathlib import Path

def explain_and_log(instance_id, instance, explainer, log_dir="explanations"):
    explanation = explainer.explain(instance)
    record = {
        "instance_id": instance_id,
        "timestamp": "...",
        "explainer": type(explainer).__name__,
        "data": explanation.data,
        "meta": explanation.meta,
    }
    Path(log_dir, f"{instance_id}.json").write_text(json.dumps(record))
```

For high-risk systems, store every explanation alongside the
prediction (immutable audit log). Pair with `qa-compliance/audit-trail-test-author`
in the testland-qa marketplace for storage assertions.

## Step 7 - Don't confuse with alibi-detect

Alibi Explain is the explanation library. Drift detection uses the
sister package `alibi-detect` (`pip install alibi-detect`) - that
covers concept drift, adversarial detection, outlier detection. They
share governance but are separate packages.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use Kernel SHAP on every prediction in real time | O(n) model calls per explanation; latency-killer | Tree SHAP for tree models; cache for repeated instances |
| Show feature attributions to non-technical stakeholders | "0.3 contribution from 'income'" is jargon | Use Counterfactuals (Step 5) - natural-language friendly |
| Skip `fit()` step | Some explainers (Anchors) need training data summary | Always fit on representative data (Step 3) |
| Treat explanation as ground-truth causality | Attributions are model-relative, not causal | Document this in audit trail metadata |
| Mix `alibi` and `alibi-detect` packages | Different scope; same install string causes confusion | Install both explicitly when needed (Step 7) |

## Limitations

- Counterfactual explainers can produce out-of-distribution
  instances; constrain via prototypes or domain rules.
- Integrated Gradients requires gradient access (TF/PyTorch native);
  no support for opaque APIs (SaaS LLMs).

## References

- [Alibi Explain docs] - explainer categories, interface, install,
  per-method documentation

[Alibi Explain docs]: https://www.alibi.rocks/
