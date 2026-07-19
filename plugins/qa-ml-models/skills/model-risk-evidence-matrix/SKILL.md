---
name: model-risk-evidence-matrix
description: "Assigns a machine learning model to a low, medium, or high risk tier from what its predictions decide about people, then derives the fairness and explainability evidence that tier must produce: group metrics per declared sensitive feature, intersectional breakdowns with per-cell counts, vulnerability scan categories, a drift monitoring plan, and per-prediction explanation logs. Supplies conventional demographic parity difference bands, a per-vulnerability-category blocking table, and evidence rules that mark a bundle incomplete or self-contradicting. Use when a model release candidate is up for promotion and someone must decide which fairness artifacts are mandatory rather than nice to have, or when a model card declares a risk tier and the attached evidence bundle has to be checked against what that tier demands."
---

# model-risk-evidence-matrix

This is a decision matrix for one question: **given what a model decides, what
fairness and explainability evidence must exist before anyone can reason about
it?** It converts a risk tier into a required-artifact list, and converts a
missing or self-contradicting artifact into a named evidence rule.

## What this owns, and what it does not

**Owns:** the risk-tiering scheme, the evidence-required-per-tier matrix, the
conventional verdict bands on a group fairness metric, the per-vulnerability
category blocking table, and the evidence rules that mark a bundle incomplete.

**Does not own:**

- **Training or mitigation.** Nothing here retrains a model, reweights data, or
  applies a fairness constraint. When a disparity exceeds a band, this matrix
  says the bundle needs mitigation provenance. It does not produce the
  mitigation.
- **Certifying a model as fair.** A complete bundle means the evidence exists
  and is internally consistent. It does not mean the model is fair. Fairness is
  contested: "different people may have different ideas of what is fair in a
  particular scenario", and mathematical metrics "fail to capture all relevant
  aspects" ([Fairlearn, fairness in machine learning](https://fairlearn.org/main/user_guide/fairness_in_machine_learning.html)).
- **The release decision.** Whoever owns release accepts or rejects. This matrix
  supplies the evidence status they act on.

## Step 1 - Assign the risk tier

Tier on what the prediction *decides*, not on model architecture, accuracy, or
how the team feels about the use case.

| Tier | What puts a model here | Reversible by the affected person? | Example |
|---|---|:-:|---|
| Low | Internal recommendation consumed by staff; no decision about an identified individual | Yes | ranking an internal triage queue |
| Medium | External recommendation that shapes a user's experience; still no decision about the individual | Yes | storefront product recommender |
| High | Decides about an individual in credit, employment, healthcare, insurance, justice, or education | Usually not | consumer credit approval scoring |

Three external tests escalate a model to **high** regardless of where the team
first placed it. Read each at its source before relying on it:

1. **Solely automated decisions with legal or similarly significant effect.**
   GDPR Article 22(1): "The data subject shall have the right not to be subject
   to a decision based solely on automated processing, including profiling,
   which produces legal effects concerning him or her or similarly
   significantly affects him or her"
   ([Regulation (EU) 2016/679, EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679)).
2. **Listed high-risk uses under the EU AI Act.** Regulation (EU) 2024/1689
   classifies certain systems as high-risk via Article 6(2) and Annex III. The
   authoritative area list lives in the Annex itself, not in this table: read it
   at the [official EUR-Lex entry for Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
   rather than reproducing a remembered version of it.
3. **US credit decisions.** Regulation B implementing the Equal Credit
   Opportunity Act requires that "the statement of reasons for adverse action
   ... must be specific and indicate the principal reason(s) for the adverse
   action", and treats a statement that the applicant failed to reach a
   qualifying score as insufficient
   ([12 CFR 1002.9, CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1002/9/)).
   A model that drives credit denials therefore needs per-prediction reasons as
   evidence, not a claim that the model class is interpretable.

None of these three is a complete legal analysis. They are escalation triggers
that force the high tier and send the question to counsel.

## Step 2 - Read the required evidence for that tier

| Evidence artifact | Low | Medium | High |
|---|:-:|:-:|:-:|
| Performance metrics (aggregate) | required | required | required |
| Group fairness metrics per declared sensitive feature | - | required | required |
| Intersectional fairness across 2+ sensitive features | - | required | required |
| Model vulnerability scan | required | required | required |
| Drift monitoring plan with a declared reference dataset | - | required | required |
| Per-prediction (local) explanation logging | - | - | required |
| Mitigation provenance when any measured disparity is non-zero | - | required | required |

A `-` means the tier does not compel the artifact. It never means the artifact
is unwelcome.

The declared sensitive-feature list is the spine of rows 2, 3, and 7. A model
card that lists no sensitive features can only satisfy the low tier.

## Step 3 - Name the fairness metric precisely

These three metrics are commonly used interchangeably in review conversations.
They are not interchangeable. Each is defined below from
[Fairlearn's common fairness metrics guide](https://fairlearn.org/main/user_guide/assessment/common_fairness_metrics.html).

| Metric | Fairlearn's definition | What it equalizes across groups |
|---|---|---|
| Demographic parity | "ensure a machine learning model's predictions are independent of membership in a sensitive group" | selection rate |
| Equalized odds | "ensure a machine learning model performs equally well for different groups" | true positive rate **and** false positive rate |
| Equal opportunity | "a relaxed version of equalized odds that only considers conditional expectations with respect to positive labels (Y=1)" | true positive rate only |

The conditions Fairlearn states for a classifier `h` with sensitive feature `A`
and label `Y`, from the same guide:

```text
demographic parity:  E[h(X) | A=a]      = E[h(X)]         for all a
equalized odds:      E[h(X) | A=a, Y=y] = E[h(X) | Y=y]   for all a, y
equal opportunity:   the equalized-odds condition restricted to Y=1
```

The scalar reported against demographic parity is
`demographic_parity_difference`, "defined as the difference between the largest
and the smallest group-level selection rate", where a value of 0 "means that all
groups have the same selection rate"
([Fairlearn API reference](https://fairlearn.org/main/api_reference/generated/fairlearn.metrics.demographic_parity_difference.html)).
This document abbreviates it **DPD**. Note the shape: DPD is a **difference**
between rates. `demographic_parity_ratio` is a different quantity. Do not
compare a difference against a threshold written for a ratio.

Which metric a bundle should carry depends on the harm being guarded against.
Fairlearn's guidance: demographic parity where input biases are known;
equalized odds where the historical data lacks measurement bias and both error
types matter equally; equal opportunity where false positives cause less harm
than missed true positives
([Fairlearn, common fairness metrics](https://fairlearn.org/main/user_guide/assessment/common_fairness_metrics.html)).
Record the choice and its reason in the model card. An unexplained metric choice
is a gap in the bundle, because the metric can be picked after the fact to
flatter the result.

## Step 4 - Accept that the metrics conflict

Do not ask a bundle to satisfy every fairness criterion at once. It is a proven
result, not a tooling limitation, that common criteria conflict:

- Kleinberg, Mullainathan and Raghavan prove that "except in highly constrained
  special cases, there is no method that can satisfy these three conditions
  simultaneously", and that satisfying them even approximately requires the data
  to lie near one of those special cases
  ([Inherent Trade-Offs in the Fair Determination of Risk Scores](https://arxiv.org/abs/1609.05807)).
- Chouldechova shows the same tension turns on base rates: adherence to the
  criteria "may lead to considerable disparate impact when recidivism prevalence
  differs across groups"
  ([Fair prediction with disparate impact](https://arxiv.org/abs/1610.07524)).
- Fairlearn states it directly: "In some scenarios, fairness metrics such as
  demographic parity and equalized odds cannot be satisfied at the same time"
  ([Fairlearn, fairness in machine learning](https://fairlearn.org/main/user_guide/fairness_in_machine_learning.html)).

**Evidence consequence:** a bundle claiming to satisfy demographic parity *and*
equalized odds *and* calibration across groups, on data with differing base
rates, is making a claim the literature says is unavailable. Treat it as a
reporting error to investigate, not as an unusually good result.

## Step 5 - Apply the verdict bands, and label them as convention

| DPD on the declared sensitive feature | Band | What the bundle must then contain |
|---|---|---|
| DPD <= 0.05 | PASS | the measurement itself |
| 0.05 < DPD <= 0.10 | REVIEW | a written justification plus a monitoring plan |
| DPD > 0.10 | BLOCK | mitigation provenance, or a signed waiver |

**These three numbers are a practitioner convention, not a standard and not a
legal threshold.** No standards body publishes 0.05 or 0.10 as a fairness limit.
They are a starting policy for teams that have none, deliberately set tighter
than any enforcement heuristic so that the review happens before a regulator's
does.

The nearest well-known regulatory heuristic is the four-fifths rule, and even
that is expressly not a legal test: the EEOC states the "'4/5ths' or '80%' rule
of thumb is not intended as a legal definition, but is a practical means of
keeping the attention of the enforcement agencies on serious discrepancies in
rates of hiring, promotion and other selection decisions"
([EEOC Q&A on the Uniform Guidelines](https://www.eeoc.gov/laws/guidance/questions-and-answers-clarify-and-provide-common-interpretation-uniform-guidelines)).
It is also a **ratio** between selection rates, so it does not translate into a
DPD difference threshold.

**Who owns the numbers.** Not the person running the metrics, and not this
matrix. The band belongs to a named accountable owner recorded in the model
card: legal counsel for a regulated decision, otherwise the risk or product
owner who accepts the consequence. Fairlearn frames fairness assessment as
requiring stakeholder identification and human judgment in context rather than a
technical fix ([Fairlearn, fairness in machine learning](https://fairlearn.org/main/user_guide/fairness_in_machine_learning.html)),
and the NIST AI Risk Management Framework is "intended for voluntary use"
rather than as a prescriptive threshold source
([NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)).
A band with no named owner is an unowned band: record that as a gap.

A waiver, where used, carries four fields and no fewer: `Reason:`,
`Approved-by:`, `Re-review-date:`, `expires:`. A waiver without an expiry is a
silent permanent exemption.

## Step 6 - Require intersectional evidence with counts

For medium and high tiers, single-attribute fairness is not sufficient evidence.
Disparities that cancel out within `sex` and within `race` separately can still
be severe at `sex x race`.

Fairlearn supports this by accepting multiple sensitive features, after which
"the `MetricFrame.by_group` property then holds the intersections of these
groups". The same guide warns that "some of the intersections may have very few
members (or even be empty)", that an empty intersection shows as `NaN`, and that
"random noise has a greater effect on smaller groups". It recommends including
`count()` as a metric alongside the fairness metrics
([Fairlearn, intersecting groups](https://fairlearn.org/main/user_guide/assessment/intersecting_groups.html)).

**Evidence rule:** an intersectional table without a per-cell count column is
not intersectional evidence. Its small cells cannot be distinguished from noise,
and its `NaN` cells cannot be distinguished from unmeasured ones.

## Step 7 - Triage vulnerability scan categories

A scan of the model surfaces categories of vulnerability rather than a single
score. Giskard's scan reports performance bias, unrobustness, overconfidence,
underconfidence, unethical behaviour, data leakage, stochasticity, and spurious
correlation
([Giskard tabular scan](https://legacy-docs.giskard.ai/en/stable/open_source/scan/scan_tabular/index.html)).

This matrix assigns a blocking rule to six of them:

| Scan category | Blocks the bundle? | Why |
|---|---|---|
| Performance bias on a sensitive feature | YES | same disparity as Step 5, found on a different path |
| Data leakage | YES | training contamination invalidates every metric in the bundle |
| Unethical behaviour | YES | needs a human review record, not an automated pass |
| Unrobustness | Depends on input source: block when the input is user-controlled | an adversary can reach a user-controlled input |
| Underconfidence | NO | advisory; record it, do not gate on it |
| Stochasticity | NO when reproducible runs are configured; otherwise treat as unresolved | non-reproducible runs make every other finding unrepeatable |

Overconfidence and spurious correlation carry no blocking rule here. Record them
and route them to whoever owns model quality.

## Step 8 - Check the evidence rules

Each rule below marks a bundle **incomplete** (a required artifact is absent) or
**contradicted** (the bundle asserts something its own artifacts do not
support). Neither status is a statement about the model. Both are statements
about the evidence.

| Rule | Trigger | Status |
|---|---|---|
| R1 | Tier is medium or high and the declared sensitive-feature list is empty or `["none"]` | incomplete: rows 2, 3 and 7 of the Step 2 matrix cannot be evaluated at all |
| R2 | Tier is high and no per-prediction explanation logs exist | incomplete: the artifact Step 2 marks required for high is absent |
| R3 | Any DPD exceeds 0.10 with no mitigation provenance and no waiver carrying all four fields | incomplete: the Step 5 BLOCK band names an artifact that is missing |
| R4 | The model card claims production drift monitoring but no schedule, reference dataset, or alert route exists | contradicted: a claim without its artifact |
| R5 | The vulnerability scan reports data leakage | contradicted: every performance and fairness number in the bundle is computed on compromised data |
| R6 | Tier is medium or high and no intersectional table exists, or it exists without per-cell counts | incomplete: see Step 6 |

R4 depends on a real reference dataset, not a nominal one. Evidently's drift
preset requires both datasets to be supplied: "You must always pass both: the
current one will be compared to the reference"
([Evidently data drift preset](https://docs.evidentlyai.com/metrics/preset_data_drift)).
A monitoring plan naming no reference dataset cannot run.

R2 depends on **local** explanations, meaning explanations of individual
predictions. Explainability insights divide into local and global, where local
insights concern individual predictions; Anchors finds "which set of features of
a given instance are sufficient to ensure the prediction stays the same" and
counterfactuals find "what minimal change to features is required to reclassify
the current prediction"
([Alibi Explain](https://docs.seldon.ai/alibi-explain/)).
A global feature-importance chart does not satisfy R2, because the ECOA
requirement in Step 1 is a reason for *this* applicant's decision.

## Worked example

**Input.** Model card declares: consumer credit approval scoring, tier stated as
medium, sensitive features `["sex", "race"]`, "monitored in production". Bundle
contains aggregate metrics, a group fairness table on `sex` and on `race`, and a
vulnerability scan.

**Step 1.** The stated tier is wrong. Credit approval decides about an
individual in credit, and Regulation B requires specific principal reasons for
an adverse action ([12 CFR 1002.9](https://www.consumerfinance.gov/rules-policy/regulations/1002/9/)).
Re-tier to **high**. Every subsequent step uses the high column.

**Step 2 gap list.** Intersectional table: absent. Per-prediction explanation
logs: absent. Drift monitoring plan: claimed, artifact not present.

**Step 3.** The bundle reports DPD only. That is a defensible choice for credit
selection, but the model card gives no reason for it, so the choice itself is
recorded as a gap.

**Step 5.** DPD on `sex` is 0.087, landing in the REVIEW band, so a written
justification plus a monitoring plan must be present. DPD on `race` is 0.04,
PASS.

**Steps 6 and 8.** R6 fires (no intersectional table). R2 fires (no explanation
logs). R4 fires (production monitoring claimed, no schedule or reference
dataset).

**Output.**

```markdown
## Evidence coverage - `credit-approval-v4`

Tier as declared: medium
Tier as assessed: HIGH (individual credit decision; adverse-action reasons required)
Sensitive features declared: sex, race
Bundle status: INCOMPLETE (3 rules fired)

| Required artifact (high tier) | Present | Note |
|---|---|---|
| Performance metrics | yes | accuracy 0.86, AUC 0.89 |
| Group fairness: sex | yes | DPD 0.087 -> REVIEW band, justification missing |
| Group fairness: race | yes | DPD 0.04 -> PASS |
| Intersectional (sex x race, with counts) | no | R6 |
| Vulnerability scan | yes | 0 blocking categories, 2 underconfidence findings (advisory) |
| Drift monitoring plan | claimed | R4: no schedule, no reference dataset |
| Per-prediction explanation logs | no | R2 |
| Mitigation provenance (DPD > 0) | no | required once a disparity is non-zero |

### Rules fired

- R2 - high tier, no local explanation logging.
- R4 - "monitored in production" asserted with no reference dataset or schedule.
- R6 - no intersectional table across the two declared sensitive features.

### Unowned decisions

- No named owner recorded for the 0.05 / 0.10 DPD bands.
- No recorded reason for choosing demographic parity over equalized odds.

### To close the bundle

1. Produce an intersectional table across sex x race including a per-cell count column.
2. Log local explanations for at least one positive and one negative predicted class.
3. Attach the drift schedule plus the named reference dataset, or drop the monitoring claim.
4. Attach mitigation provenance or a four-field waiver for the 0.087 DPD on sex.
5. Record the band owner and the metric-choice rationale in the model card.
```

The output never says the model is fair or unfair. It says which required
evidence exists and where the bundle contradicts itself.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Tier on model architecture or accuracy | Tier is set by what the prediction decides about a person, not by how the model works | Step 1 |
| Treat aggregate accuracy as fairness evidence | Aggregates hide per-group disparity by construction | require the Step 2 group rows |
| Use "demographic parity" and "equalized odds" as synonyms | They equalize different quantities and can conflict | Step 3 definitions |
| Demand every fairness criterion at once | Proven unavailable outside constrained special cases | Step 4 |
| Present 0.05 / 0.10 as a legal or standards threshold | No standards body publishes them; the nearest heuristic is explicitly not a legal definition | label as convention, name an owner (Step 5) |
| Compare a difference metric against the 80% ratio rule | Difference and ratio are different quantities | pick one shape and state it (Step 3) |
| Single sensitive attribute only | Cancels out intersectional disparity | Step 6 |
| Intersectional table without counts | Small cells are indistinguishable from noise | Step 6 |
| Skip explanation logging because the model class is "interpretable" | Adverse-action rules require a reason for the individual decision, not a model property | Step 8, R2 |
| Waiver with no expiry | Becomes a permanent silent exemption | four-field waiver (Step 5) |

## Limitations

- **Proxy features are out of range.** A bundle can pass every rule here while
  the model discriminates through a correlated proxy such as postcode. Group
  metrics computed on declared sensitive features do not detect that. Pair this
  matrix with feature-correlation analysis and domain review.
- **Unmeasured groups stay unmeasured.** Every rule keys off the declared
  sensitive-feature list. If a relevant attribute was never collected, no rule
  fires, and the bundle can be complete and blind at the same time.
- **The tiers are coarse.** Three tiers cannot express every regulated context.
  Where a specific regime applies, the regime's own classification governs and
  this table is the fallback.
- **Evidence completeness is not fairness.** Restating the boundary because it
  is the failure mode this matrix most often invites: a complete bundle means
  the artifacts exist and agree with each other. Judging whether the outcome is
  acceptable is a human decision made in context.
