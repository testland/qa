# qa-ml-models

ML model testing: vulnerability scanning, data validation, drift
monitoring, group fairness, and per-prediction explainability. Five
skills covering Giskard (`scan()` + test catalog), Deepchecks
(suites for data integrity / train-test / model evaluation),
Evidently (drift monitoring + 100+ metrics), Fairlearn (`MetricFrame`
+ Reductions mitigation), Alibi Explain (Anchors / SHAP / Integrated
Gradients / Counterfactuals) - plus a reviewer agent
(`model-fairness-reviewer`) that gates promotion based on the model's
risk class.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [giskard-tests](skills/giskard-tests/SKILL.md) | `scan()` for performance bias / data leakage / robustness / ethical issues; auto-generates test suites |
| Skill | [deepchecks-tests](skills/deepchecks-tests/SKILL.md) | Data integrity, train-test validation, model evaluation suites - same checks across research / CI / production |
| Skill | [evidently-monitoring](skills/evidently-monitoring/SKILL.md) | Reference-vs-current drift detection; PSI / KS / Wasserstein stat tests; production scheduling |
| Skill | [fairlearn-fairness](skills/fairlearn-fairness/SKILL.md) | `MetricFrame` group-disaggregated metrics; `ExponentiatedGradient` + `ThresholdOptimizer` mitigation |
| Skill | [alibi-explainability](skills/alibi-explainability/SKILL.md) | Anchors / SHAP / Integrated Gradients / Counterfactuals; per-prediction explanation logging for high-risk systems |
| Agent | [model-fairness-reviewer](agents/model-fairness-reviewer.md) | Adversarial reviewer that gates promotion on risk-class-appropriate evidence; refuses ✅ when sensitive features missing or intersectional analysis absent |
| Agent | [data-drift-incident-responder](agents/data-drift-incident-responder.md) | Triages a live Evidently drift alert into ranked root-cause hypotheses (schema change, pipeline bug, skew, seasonality, population shift) plus a remediation checklist; decides rollback, retrain, quarantine, or alert re-tune |
| Skill | [model-performance-regression-gate](skills/model-performance-regression-gate/SKILL.md) | CI gate that blocks a retrained model regressing on held-out metrics vs production. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ml-models@testland-qa
```
