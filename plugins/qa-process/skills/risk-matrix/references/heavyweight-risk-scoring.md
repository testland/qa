# Heavyweight risk scoring: FMEA and Cost of Exposure

Deep reference for the `risk-matrix` SKILL.md. Use when the default lightweight impact-by-likelihood matrix (Step 1) is insufficient - regulated industries, safety-critical systems, or when test budget must be justified in financial terms to non-technical stakeholders.

Both methods are the heavyweight branch of risk-based testing per
[Risk-based testing (Wikipedia)](https://en.wikipedia.org/wiki/Risk-based_testing),
which names FMEA, Cost of Exposure, QFD, and FTA as the quantitative alternatives to lightweight scoring and describes them as tools for "financial impact analysis". They need specialized expertise; reach for them only when regulation or a money-based mitigate-or-accept decision requires it.

## FMEA (Failure Mode and Effect Analysis)

Per row: **failure mode + effect + severity (1-10) + occurrence (1-10) + detectability (1-10) → RPN (Risk Priority Number = S × O × D, range 1-1000)**.

```markdown
| ID  | Failure mode                  | Effect                            | S  | O | D | RPN | Action |
|-----|--------------------------------|-----------------------------------|----|---|---|-----|--------|
| F-1 | Promo math wrong               | Wrong charge to customer           | 8  | 5 | 4 | 160 | property tests |
| F-2 | Stripe webhook missed          | Order not fulfilled                | 9  | 4 | 6 | 216 | retry + DLQ + monitor |
```

Detectability is the inverse of "tests would catch it" - high D = hard to catch = high RPN. Two rows with equal severity and occurrence rank differently purely on how visible the failure is to existing checks.

## Cost of Exposure

Quantify the annual financial risk and weigh it against the one-time plus recurring mitigation cost:

```markdown
Risk: Stripe webhook delivery failure
- Estimated incidents per year (untreated): 12
- Average revenue lost per incident: $5,000
- Annual cost of exposure: $60,000
- Cost of mitigation (retry + DLQ + monitor): $15,000 one-time + $2,000/year
- Decision: Mitigate (ROI in 3 months)
```

Cost of Exposure turns "this is risky" into a budget line a finance stakeholder can approve or reject.

## When each applies

| Method | Reach for it when |
|--------|-------------------|
| FMEA | A regulated or safety-critical product needs a defensible, reproducible ranking with a detectability dimension the lightweight 5x5 lacks. |
| Cost of Exposure | Test budget must be justified in money, or the mitigate-or-accept decision hinges on ROI rather than a score threshold. |
