# Worked output example - experiment validation

The report this skill emits, for a multi-metric experiment where the
primary metric wins but a guardrail metric regresses.

```markdown
## Experiment validation - `checkout-promo-banner-v2`

**Run period:** 2026-04-15 to 2026-05-05 (21 days)
**Hypothesis:** Promo banner increases checkout completion.
**Variants:** control (12,450 users), treatment_a (12,380 users)
**Multiple-comparisons correction:** Benjamini-Hochberg FDR, α=0.05
**Verdict:** ⚠ MIXED - primary metric significant; secondary regressed.

### Per-metric results

| Metric                          | Type        | Control | Treatment | Effect (rel) | p-value (raw) | p-value (adj) | MDE met? | Verdict |
|---------------------------------|-------------|---------|-----------|--------------|--------------:|--------------:|----------|---------|
| **checkout_completion_rate**     | proportion  |  68.5%  |  70.7%   |     +3.2%    |        0.012  |        0.024  |   ✅ (>1%) |    ✅ ship  |
| avg_session_duration_sec         | continuous  |   245   |   238    |     -2.9%    |        0.18   |        0.36   |    n/a   |    ─ no signal  |
| avg_revenue_per_user             | continuous  |  $4.21  |  $3.98   |     -5.5%    |        0.044  |        0.088  |    ⚠     |    ⚠ trend; not significant after FDR |
| signup_rate                      | proportion  |   4.2%  |   4.3%   |     +2.4%    |        0.61   |        0.61   |    no    |    ─ no signal  |
| support_tickets_per_user         | continuous  |   0.12  |   0.14   |    +16.7%    |        0.008  |        0.024  |    ✅     |    ⚠ ship-blocker - investigate |

### Verdict explanation

The primary metric (checkout completion) shows a 3.2% relative lift
that's statistically significant after FDR correction (p_adj=0.024)
and meets the MDE (>1%). On its own, this is a ship signal.

However:
- support_tickets_per_user shows a +16.7% relative increase
  (p_adj=0.024; significant). This is a ship-blocker; investigate
  what about the promo banner is causing more tickets.
- avg_revenue_per_user trends down (-5.5%) but isn't significant
  after correction (p_adj=0.088). Cautionary signal; investigate
  whether the lift in completion comes at the cost of basket size.

### Recommendation

PAUSE the ship. Investigate:
1. Why support tickets increased (categorize the new tickets;
   identify the issue type).
2. Whether revenue per user is genuinely down or artifact of
   variance.

If both are addressed, re-run for additional 7 days to validate.

### Power analysis

The experiment had sufficient power (>80%) to detect a 1% relative
lift on the primary metric. For revenue (-5.5% observed but not
significant): would need ~22,000 users per variant for 80% power;
current 12,400 is under-powered.
```
