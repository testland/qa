# qa-ml-models

ML model testing: vulnerability scanning, data validation, drift
monitoring, group fairness, and per-prediction explainability. Five
S1 skills covering Giskard (`scan()` + test catalog), Deepchecks
(suites for data integrity / train-test / model evaluation),
Evidently (drift monitoring + 100+ metrics), Fairlearn (`MetricFrame`
+ Reductions mitigation), Alibi Explain (Anchors / SHAP / Integrated
Gradients / Counterfactuals) — plus an A3 reviewer agent
(`model-fairness-reviewer`) that gates promotion based on the model's
risk class.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [giskard-tests](skills/giskard-tests/SKILL.md) | S1 | `scan()` for performance bias / data leakage / robustness / ethical issues; auto-generates test suites |
| Skill | [deepchecks-tests](skills/deepchecks-tests/SKILL.md) | S1 | Data integrity, train-test validation, model evaluation suites — same checks across research / CI / production |
| Skill | [evidently-monitoring](skills/evidently-monitoring/SKILL.md) | S1 | Reference-vs-current drift detection; PSI / KS / Wasserstein stat tests; production scheduling |
| Skill | [fairlearn-fairness](skills/fairlearn-fairness/SKILL.md) | S1 | `MetricFrame` group-disaggregated metrics; `ExponentiatedGradient` + `ThresholdOptimizer` mitigation |
| Skill | [alibi-explainability](skills/alibi-explainability/SKILL.md) | S1 | Anchors / SHAP / Integrated Gradients / Counterfactuals; per-prediction explanation logging for high-risk systems |
| Agent | [model-fairness-reviewer](agents/model-fairness-reviewer.md) | A3 | Adversarial reviewer that gates promotion on risk-class-appropriate evidence; refuses ✅ when sensitive features missing or intersectional analysis absent |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ml-models@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
