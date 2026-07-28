# Worked example - model-risk-evidence-matrix

A walk-through of a mis-tiered credit model checked against the evidence
matrix. Step numbers and rule IDs (R2, R4, R6) refer back to SKILL.md.

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
