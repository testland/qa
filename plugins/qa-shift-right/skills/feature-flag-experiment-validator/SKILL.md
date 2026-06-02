---
name: feature-flag-experiment-validator
description: "Validates the statistical significance of an A/B / feature-flag experiment result - computes per-metric effect size + p-value (chi-square for proportions, Welch's t-test for continuous metrics), applies a multiple-comparison correction (Bonferroni / Benjamini-Hochberg) when N>1 metric, surfaces practical-vs-statistical-significance distinction, and emits a ship/don't-ship verdict per metric. Use to keep PMs / engineers from \"shipping the winning variant\" based on under-powered or multiple-tested results - the rigorous version of \"the variant looks better in the dashboard."
rating: 23
d6: 4
archetype: S3
---

# feature-flag-experiment-validator

## Overview

Per [ab-test-wiki][ab]:

[ab]: https://en.wikipedia.org/wiki/A/B_testing

> "**A/B testing**" is "a shorthand for a simple randomized
> controlled experiment" comparing samples of a single variable.
> ([ab-test-wiki][ab])

Per Pete Hodgson's feature toggle taxonomy
([feature-toggles][toggles]):

[toggles]: https://martinfowler.com/articles/feature-toggles.html

> "Each user of the system is placed into a cohort and at runtime
> the Toggle Router will consistently send a given user down one
> codepath or the other." ([feature-toggles][toggles])

The combination produces an **experiment toggle** A/B test: users
split into cohorts, behavior measured per cohort, ship the winning
variant.

The risk: per [ab-test-wiki][ab]: "A/B tests are sensitive to
variance; they require a large sample size in order to reduce
standard error and produce a statistically significant result."
Without proper analysis, teams ship variants that "look better"
but aren't actually better.

This skill validates the analysis.

## When to use

- An A/B test has run for some time and the team wants the verdict.
- The team's analytics tool (Mixpanel, Amplitude, Statsig) reports
  a winner but the team wants an independent statistical check.
- A multi-metric experiment needs multiple-comparisons correction
  before a ship decision.
- A close-call experiment (treatment 2.1% better; p=0.06) needs
  rigorous interpretation.

## Step 1 - Inputs

The validator needs, per variant:

```yaml
# experiment-data.yml
experiment_id: checkout-promo-banner-v2
running_since: 2026-04-15
running_until: 2026-05-05    # 21 days
hypothesis: "Promo banner increases checkout completion."

variants:
  - name: control
    cohort_size: 12450
    metrics:
      checkout_completion_count: 8523
      avg_session_duration_sec: [...samples...]   # raw samples for continuous metrics
      avg_revenue_per_user: [...samples...]

  - name: treatment_a
    cohort_size: 12380
    metrics:
      checkout_completion_count: 8755
      avg_session_duration_sec: [...samples...]
      avg_revenue_per_user: [...samples...]
```

Per-metric, identify whether it's:

- **Proportion** (count / total - e.g. completion rate, sign-up
  rate, click-through rate).
- **Continuous** (latency, revenue per user, session duration,
  page count).

Different statistical tests apply.

## Step 2 - Test per metric type

### Proportions: chi-square or Fisher's exact

For "did the user convert? yes/no":

```python
from scipy.stats import chi2_contingency

def proportion_test(c_success, c_total, t_success, t_total):
    """Returns (p_value, effect_size_pct)."""
    table = [[c_success, c_total - c_success],
             [t_success, t_total - t_success]]
    chi2, p, dof, _ = chi2_contingency(table)
    c_rate = c_success / c_total
    t_rate = t_success / t_total
    effect = (t_rate - c_rate) / c_rate * 100   # relative lift in %
    return p, effect
```

For very small cells (< 5 expected per cell), Fisher's exact is
more accurate; chi-square otherwise.

### Continuous: Welch's t-test or Mann-Whitney U

For "what's the average revenue per user?":

```python
from scipy.stats import ttest_ind, mannwhitneyu

def continuous_test(c_samples, t_samples, parametric=True):
    """Welch's t-test (parametric) or Mann-Whitney U (non-parametric)."""
    if parametric:
        t, p = ttest_ind(c_samples, t_samples, equal_var=False)
    else:
        u, p = mannwhitneyu(c_samples, t_samples, alternative='two-sided')
    c_mean = sum(c_samples) / len(c_samples)
    t_mean = sum(t_samples) / len(t_samples)
    effect = (t_mean - c_mean) / c_mean * 100
    return p, effect
```

Use **Mann-Whitney U** when the metric isn't normally distributed
(revenue per user - heavy right tail; latency - log-normal).
Welch's t-test for approximately-normal metrics.

## Step 3 - Multiple-comparisons correction

Per [ab-test-wiki][ab]'s "challenges" framing: testing many metrics
inflates the false-positive rate. With α=0.05 and 10 independent
metrics, P(at least one false positive) ≈ 1 - 0.95^10 = 40%.

**Default: Benjamini-Hochberg FDR control** - balances false-positive
vs false-negative rates; controls the proportion of "wins" that are
actually noise. Use Bonferroni when the cost of any false positive is
catastrophic (regulatory / safety contexts) and over-conservatism is
acceptable.

### Benjamini-Hochberg (FDR control)

```python
from statsmodels.stats.multitest import multipletests

reject, p_adj, _, _ = multipletests(p_values, alpha=0.05, method='fdr_bh')
# `reject[i]` is True when metric i is significant after FDR control.
```

### Bonferroni (escape hatch - conservative)

```python
adjusted_alpha = alpha / n_metrics    # e.g. 0.05 / 10 = 0.005
# Each metric must have p < 0.005 to be significant.
```

Over-conservative - increases false negatives.

For pre-registered single-primary-metric experiments, no correction
needed for the primary; correction applies to secondary metrics.

## Step 4 - Power analysis (was the experiment big enough?)

A non-significant result might mean "no effect" or "experiment too
small." Compute post-hoc power:

```python
from statsmodels.stats.power import NormalIndPower

def required_sample(effect_size, alpha=0.05, power=0.8):
    """How many users per variant to detect this effect with this power?"""
    analysis = NormalIndPower()
    return analysis.solve_power(effect_size=effect_size, alpha=alpha, power=power)
```

If the observed effect (e.g., 0.5% relative lift) requires N=50,000
users per variant for 80% power and the experiment had N=12,000,
the experiment was under-powered. The verdict shouldn't be "no
effect"; it should be "inconclusive - re-run at higher N or accept
that we can't detect effects this small."

## Step 5 - Practical vs statistical significance

A 0.1% lift can be statistically significant at N=10M; that doesn't
mean the team should ship.

Define **minimum detectable effect (MDE)** per metric:

```yaml
# mde.yml
checkout_completion_rate:
  mde_relative: 1.0   # 1% relative lift to be worth shipping
  mde_absolute: 0.5   # OR a 0.5pp absolute lift

avg_revenue_per_user:
  mde_absolute: 0.50  # $0.50/user; below this, ship cost > revenue
```

The verdict requires **both** statistical significance AND practical
significance (effect ≥ MDE).

## Step 6 - Output

```markdown
## Experiment validation — `checkout-promo-banner-v2`

**Run period:** 2026-04-15 to 2026-05-05 (21 days)
**Hypothesis:** Promo banner increases checkout completion.
**Variants:** control (12,450 users), treatment_a (12,380 users)
**Multiple-comparisons correction:** Benjamini-Hochberg FDR, α=0.05
**Verdict:** ⚠ MIXED — primary metric significant; secondary regressed.

### Per-metric results

| Metric                          | Type        | Control | Treatment | Effect (rel) | p-value (raw) | p-value (adj) | MDE met? | Verdict |
|---------------------------------|-------------|---------|-----------|--------------|--------------:|--------------:|----------|---------|
| **checkout_completion_rate**     | proportion  |  68.5%  |  70.7%   |     +3.2%    |        0.012  |        0.024  |   ✅ (>1%) |    ✅ ship  |
| avg_session_duration_sec         | continuous  |   245   |   238    |     -2.9%    |        0.18   |        0.36   |    n/a   |    ─ no signal  |
| avg_revenue_per_user             | continuous  |  $4.21  |  $3.98   |     -5.5%    |        0.044  |        0.088  |    ⚠     |    ⚠ trend; not significant after FDR |
| signup_rate                      | proportion  |   4.2%  |   4.3%   |     +2.4%    |        0.61   |        0.61   |    no    |    ─ no signal  |
| support_tickets_per_user         | continuous  |   0.12  |   0.14   |    +16.7%    |        0.008  |        0.024  |    ✅     |    ⚠ ship-blocker — investigate |

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

## Step 7 - Recommended cadence

Validate the experiment:

- **At pre-defined stop date** (preferred - pre-registered).
- **At minimum required sample** (per Step 4 power analysis).
- **NOT at "first day of significance"** - peeking at running
  experiments inflates false positives (the "early stopping"
  problem).

If continuous monitoring is required (e.g. a regression-detection
A/B test), use a **sequential testing** framework (`statsmodels`'
sequential probability ratio test) instead of repeated significance
tests.

## Anti-patterns

| Anti-pattern                                                              | Why it fails                                                                | Fix |
|---------------------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| Peeking and stopping at first significance                                | Inflates false-positive rate dramatically.                                 | Pre-register stop date OR use sequential testing (Step 7). |
| Single metric only                                                         | Misses regressions in secondary metrics (revenue down even though completion up). | 5-10 metrics including guardrails (Step 1). |
| No multiple-comparisons correction                                         | 10 metrics × α=0.05 = 40% chance of false positive somewhere.              | FDR / Bonferroni (Step 3). |
| Ship based on practical significance without statistical                  | Random variance gets shipped as "lift."                                    | Both required (Step 5). |
| Ship based on statistical significance without practical                  | 0.1% lift at N=10M ships; not worth maintenance burden.                    | MDE per metric (Step 5). |
| Welch's t-test on heavy-tailed metrics (revenue)                          | Test invalid; conclusion wrong.                                            | Mann-Whitney U for non-normal metrics (Step 2). |
| Ignoring guardrail metrics (support tickets, churn, refund rate)          | Ship something that breaks downstream.                                    | Always include guardrails (Step 6 example). |

## Limitations

- **Causal inference assumes proper randomization.** If users
  self-select into variants (geography, plan tier), bias is
  uncorrected.
- **No defense against contamination.** Users that switch variants
  mid-experiment violate randomization; flag and exclude.
- **Power analysis is parametric.** Real distributions deviate;
  use bootstrap for non-parametric power estimation.
- **Network effects unmeasured.** A user-level test may underestimate
  effects when treatment users influence control users (social
  features, marketplaces).
- **Doesn't replace product judgment.** A statistically significant
  win that contradicts brand strategy isn't auto-ship.

## References

- [ab-test-wiki][ab] - A/B testing definition; "A/B tests are
  sensitive to variance; they require a large sample size in order
  to reduce standard error and produce a statistically significant
  result"; statistical hypothesis testing framing.
- [feature-toggles][toggles] - experiment toggles: per-cohort
  routing; "highly dynamic ... requires sufficient runtime to
  generate statistically valid results."
- [`feature-flag-test-harness`](../../qa-test-environment/skills/feature-flag-test-harness/SKILL.md) - sibling: harness that runs the experiment IN test (this skill
  validates the experiment IN production).
- [`prod-canary-validator`](../prod-canary-validator/SKILL.md) - 
  sibling: same statistical framework, different application
  (canary verdict vs experiment verdict).
- [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md) - sibling: production-side verification, different role.
