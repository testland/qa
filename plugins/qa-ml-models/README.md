# qa-ml-models

ML model testing: vulnerability scanning, data validation, drift
monitoring with alert triage, group fairness, and risk-tiered evidence
gating. Seven skills covering Giskard (`scan()` + test catalog),
Deepchecks (suites for data integrity / train-test / model evaluation),
Evidently (drift monitoring + drift-alert triage playbook), Fairlearn
(`MetricFrame` + Reductions mitigation), a retrain regression gate,
the model-risk evidence matrix (risk tiering, fairness gating workflow,
and Alibi Explain per-prediction explanation records), and the Jupyter
notebook CI pipeline (papermill + nbval + testbook + nbstripout).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [giskard-tests](skills/giskard-tests/SKILL.md) | `scan()` for performance bias / data leakage / robustness / ethical issues; auto-generates test suites |
| Skill | [deepchecks-tests](skills/deepchecks-tests/SKILL.md) | Data integrity, train-test validation, model evaluation suites - same checks across research / CI / production |
| Skill | [evidently-monitoring](skills/evidently-monitoring/SKILL.md) | Reference-vs-current drift detection; PSI / KS / Wasserstein stat tests; production scheduling; drift-alert triage playbook (ranked root-cause hypotheses: schema change, pipeline bug, skew, seasonality, population shift) |
| Skill | [fairlearn-fairness](skills/fairlearn-fairness/SKILL.md) | `MetricFrame` group-disaggregated metrics; `ExponentiatedGradient` + `ThresholdOptimizer` mitigation |
| Skill | [model-performance-regression-gate](skills/model-performance-regression-gate/SKILL.md) | CI gate that blocks a retrained model regressing on held-out metrics vs production. |
| Skill | [model-risk-evidence-matrix](skills/model-risk-evidence-matrix/SKILL.md) | Assigns a model a risk tier and derives the fairness and explainability evidence that tier must produce; fairness gating workflow with promote / needs-work / block verdicts and refuse rules; Alibi Explain explanation-record authoring in references/. |
| Skill | [notebook-ci-pipeline-author](skills/notebook-ci-pipeline-author/SKILL.md) | Wires papermill (parameterized execution), nbval (output regression), testbook (function unit tests), and nbstripout into one GitHub Actions notebook CI pipeline, with a notebook PR review checklist (BLOCK / WARN / INFO); per-tool depth in references/. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ml-models@testland-qa
```
