---
component: model-fairness-reviewer
type: agent
archetype: A3
---

# model-fairness-reviewer — evals

Companion eval cases for [`model-fairness-reviewer`](../../model-fairness-reviewer.md).
Three cases cover happy path / branch / adversarial: a high-risk credit
model with intersectional disparity (BLOCK), a low-risk recommender with
sufficient evidence (promote), and a refuse-to-proceed when a
medium-risk model card declares `sensitive_features: ["none"]`.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — high-risk model, intersectional disparity (BLOCK)

**Input:**

```
Review this model release candidate against the fairness + explainability
evidence bundle.

model_card.json:
{
  "model_id": "credit-default-v3",
  "version": "3.4.1",
  "risk_class": "high",
  "intended_use": "Consumer credit-decisioning (ECOA-regulated)",
  "sensitive_features": ["sex", "race", "age_band"],
  "intersectional_groups": [["sex", "race"], ["age_band", "race"]],
  "training_data_source": "internal-loan-history-2022-2025"
}

fairlearn_metric_frame.json:
{
  "by_group": {
    "female":   {"accuracy": 0.84, "selection_rate": 0.31},
    "male":     {"accuracy": 0.86, "selection_rate": 0.39}
  },
  "difference": {"accuracy": 0.02, "selection_rate": 0.08}
}

fairlearn_intersectional.json:
{
  "by_group": {
    "female_black":  {"selection_rate": 0.18},
    "female_white":  {"selection_rate": 0.40},
    "male_black":    {"selection_rate": 0.28},
    "male_white":    {"selection_rate": 0.42}
  },
  "max_pairwise_difference": {"selection_rate": 0.24}
}

giskard_scan.json:
{
  "vulnerabilities": [
    {"category": "Underconfidence", "severity": "minor"}
  ]
}

evidently_schedule.json:
{ "scheduled": true, "cron": "0 6 * * *", "alert_route": "oncall-ml" }

evidence/explanations/positive_sample.json:
{ "meta": {"explanation_type": "anchors"}, "data": {"anchor": [...]} }

evidence/explanations/negative_sample.json:
{ "meta": {"explanation_type": "counterfactual"}, "data": {"cf": [...]} }

deepchecks_suite.json:
{ "data_integrity": "passed", "train_test_validation": "passed",
  "model_evaluation": "passed" }
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 classifies the model as `High` risk. Step 2
confirms sensitive_features declared (sex, race, age_band) — passes.
Step 3 computes per-group fairness on sex: DPD = 0.08 → 🟡
`needs justification + monitoring plan`. Step 4 computes intersectional
on sex × race: max_pairwise_difference selection_rate = 0.24 → DPD
> 0.10 → requires mitigation (Reductions or ThresholdOptimizer) before
promotion. Step 5 Giskard scan shows only minor underconfidence (NO
block). Step 6 Evidently schedule is configured. Step 7 per-prediction
explanations present for both positive and negative classes. Step 8
verdict: ❌ BLOCK due to intersectional DPD = 0.24 > 0.10 without a
documented waiver. Recommended actions name `ExponentiatedGradient`
with `EqualizedOdds` constraint and re-run Fairlearn intersectional.

**Pass condition:** Output contains the literal string `BLOCK` AND
the literal string `intersectional` AND at least one of
`ExponentiatedGradient` / `EqualizedOdds` / `ThresholdOptimizer` /
`Reductions` (named mitigation methods). Output does NOT contain a
`promote` / ✅ verdict.

## Eval 2 — branch — low-risk recommender (promote)

**Input:**

```
Review this model release candidate against the fairness + explainability
evidence bundle.

model_card.json:
{
  "model_id": "internal-content-recsys",
  "version": "1.2.0",
  "risk_class": "low",
  "intended_use": "Internal recommendations for editorial dashboard; reversible; no individual decisions about employment / credit / housing / healthcare",
  "sensitive_features": ["none"],
  "training_data_source": "editorial-clickstream-2024-2025"
}

performance_metrics.json:
{ "ndcg@10": 0.72, "recall@50": 0.61, "auc": 0.81 }

giskard_scan.json:
{
  "vulnerabilities": [
    {"category": "Stochasticity", "severity": "minor"}
  ]
}
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 classifies as `Low` risk (internal, reversible,
no individual decisions). The risk × evidence matrix in Step 1 shows
that Low risk only requires Performance metrics + Vulnerability scan;
group fairness, intersectional, drift plan, and per-prediction
explanations are not required. Step 2 sensitive_features `["none"]`
is acceptable for the lowest-risk class per the agent's own rule.
Step 5 Giskard scan reports only minor stochasticity (NO block —
the per-category table says "NO if reproducible runs configured").
Step 8 verdict: ✅ promote — risk class doesn't require fairness /
explanation evidence.

**Pass condition:** Output contains the literal string `promote` (or
the literal `✅`) AND a phrase indicating the risk class doesn't
require the missing fairness evidence (e.g., `Low risk` / `risk class
doesn't require` / `not required for low risk`). Output does NOT
contain a `BLOCK` verdict, and does NOT flag the missing fairness
evidence as a gap.

## Eval 3 — adversarial — medium-risk with sensitive_features = ["none"] (refuse)

**Input:**

```
Review this model release candidate against the fairness + explainability
evidence bundle.

model_card.json:
{
  "model_id": "support-ticket-router",
  "version": "2.1.0",
  "risk_class": "medium",
  "intended_use": "Routes inbound support tickets to specialist queues; impacts user wait time and which agent answers",
  "sensitive_features": ["none"],
  "training_data_source": "support-ticket-history-2023-2025"
}

performance_metrics.json:
{ "accuracy": 0.91, "macro_f1": 0.84 }

giskard_scan.json:
{ "vulnerabilities": [] }

evidently_schedule.json:
{ "scheduled": true, "cron": "0 */6 * * *", "alert_route": "oncall-ml" }

deepchecks_suite.json:
{ "data_integrity": "passed", "train_test_validation": "passed",
  "model_evaluation": "passed" }

# No fairlearn evidence — team claims "no protected attributes are
# relevant because the routing model doesn't see name / age / location."
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 classifies as `Medium` risk (external
recommendation, reversible, impacts user experience). Per the Step 1
matrix, Medium risk REQUIRES group fairness (Fairlearn) and
intersectional fairness. Step 2's sensitive-feature validation has an
explicit rule: `Refuse if: missing OR ["none"] for medium/high risk`.
Step 9's Refuse-to-proceed rules first item: "Risk class is
medium/high but `sensitive_features` is `["none"]`." The agent must
refuse to ✅ promote and must call out that even when protected
attributes aren't model inputs, proxies in the training data (ticket
text, language, time-of-day) can still produce disparate impact, so
the model card must declare which sensitive features were analyzed
(even if the conclusion is "no measurable disparity").

**Pass condition:** Output contains the literal string `BLOCK` (or
the literal `❌`) AND mentions `sensitive_features` AND mentions
`Medium` / `medium risk`. Output does NOT contain a `promote` / ✅
verdict and does NOT accept `["none"]` as adequate for the
medium-risk class.

## Reproducibility notes

- All three inputs are concrete pasted JSON evidence-bundle blocks
  — no external Fairlearn / Giskard / Evidently runs required to
  reproduce.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for the verdict label (BLOCK / promote) and
  the named mitigation / risk-class strings.
- Eval cases were authored 2026-05-25 against the v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
