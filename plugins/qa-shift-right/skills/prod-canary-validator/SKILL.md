---
name: prod-canary-validator
description: "Builds a canary-validation workflow that compares a canary deploy's metrics against the baseline (current main) - picks the metric set (error rate, p50/p95/p99 latency, business KPIs like checkout-completion), defines per-metric thresholds (absolute + relative-to-baseline), runs a statistical-comparison check (effect size + significance) over the canary's observation window, and emits a promote/rollback verdict. Use as the gate between canary deploy and full rollout - the deterministic version of \"the on-call eyeballs the dashboard for 30 min."
---

# prod-canary-validator

## Overview

A canary deploy's promise: "we deploy the new version to a small
slice of traffic, watch metrics, and only promote to full rollout
if metrics look healthy." The risk: "looking healthy" is a
qualitative judgment by the on-call engineer at 3am. Often the
verdict is "ship it, looks fine," and a regression slips through.

This skill builds the **deterministic** canary verdict: a
machine-checkable comparison of canary metrics vs baseline that
emits promote / pause / rollback.

It composes with [`release-engineer`](../../../qa-roles/agents/release-engineer.md)'s
canary observation step and per
[`canary-release`][cr] runs the analytical layer underneath the
human review.

[cr]: https://martinfowler.com/bliki/CanaryRelease.html

## When to use

- Canary deploys are part of the release process and the team wants
  promote/rollback decisions backed by data, not just "looks fine."
- The team has metrics infrastructure (Datadog / Prometheus /
  CloudWatch) capturing the right signals.
- A SLO depends on production verification; the canary is the
  earliest gate where regressions can be caught.

## Step 1 - Pick the metric set

Canary metrics should cover three classes:

| Class                  | Examples                                                  | Why |
|------------------------|-----------------------------------------------------------|-----|
| **Reliability**        | Error rate (5xx %), failed-request count                  | The new code may crash. |
| **Performance**        | p50 / p95 / p99 latency                                    | The new code may be slow. |
| **Business KPI**       | Checkout-completion rate, sign-up rate, revenue/min       | The new code may break a flow without crashing. |

Pick 5-10 metrics. More = noisier verdict (more chances to
trip); fewer = blind spots.

Always include **at least one business KPI** - performance and
reliability metrics can both look fine while the actual user
outcome (checkout completion) regresses.

## Step 2 - Set thresholds (absolute + relative)

Per metric, define two thresholds:

| Threshold type    | Example                                                      |
|-------------------|--------------------------------------------------------------|
| **Absolute**      | "Error rate <0.5%" - a hard floor regardless of baseline.    |
| **Relative**      | "Error rate ≤ 1.5× baseline" - catches regressions even when baseline is high. |

```yaml
# canary-thresholds.yml
metrics:
  error_rate:
    absolute: { max: 0.5 }       # %
    relative: { max: 1.5 }       # 1.5× baseline
  p95_latency:
    absolute: { max: 500 }        # ms
    relative: { max: 1.2 }
  checkout_completion_rate:
    absolute: { min: 90 }         # %
    relative: { min: 0.95 }       # at least 95% of baseline
```

The combination is essential: **absolute** catches "unacceptable
regardless"; **relative** catches "worse than the baseline by a
meaningful amount."

## Step 3 - Statistical significance

A 1-minute window of canary data has high variance. The verdict
"canary error rate 0.4% vs baseline 0.3% - promote?" depends on
sample size:

- **N=10 requests, 0.4% diff** → meaningless; could be 1 vs 0
  errors.
- **N=10,000 requests, 0.4% diff** → statistically significant;
  worth flagging.

Use a **two-sample test** (proportion test for error rate,
Welch's t-test for latency) to compute p-value:

```python
# scripts/canary_verdict.py
from scipy.stats import chi2_contingency, ttest_ind
import json

def compare_proportions(canary_success, canary_total, baseline_success, baseline_total):
    """Chi-square test for two proportions. Returns p-value."""
    table = [[canary_success, canary_total - canary_success],
             [baseline_success, baseline_total - baseline_success]]
    chi2, p, dof, _ = chi2_contingency(table)
    return p

def compare_latencies(canary_p95s, baseline_p95s):
    """Welch's t-test for two latency samples. Returns p-value."""
    t, p = ttest_ind(canary_p95s, baseline_p95s, equal_var=False)
    return p

def verdict(canary_metrics, baseline_metrics, thresholds, alpha=0.05):
    failures = []
    for metric, t in thresholds.items():
        c = canary_metrics[metric]
        b = baseline_metrics[metric]

        # Absolute check
        if 'max' in t.get('absolute', {}) and c.value > t['absolute']['max']:
            failures.append(f"{metric}: {c.value} > absolute max {t['absolute']['max']}")
        if 'min' in t.get('absolute', {}) and c.value < t['absolute']['min']:
            failures.append(f"{metric}: {c.value} < absolute min {t['absolute']['min']}")

        # Relative check (only if statistically significant)
        if metric in ('error_rate',):
            p = compare_proportions(c.success, c.total, b.success, b.total)
        else:
            p = compare_latencies(c.samples, b.samples)

        ratio = c.value / b.value if b.value else float('inf')
        if 'max' in t.get('relative', {}) and ratio > t['relative']['max'] and p < alpha:
            failures.append(f"{metric}: ratio {ratio:.2f} > relative max {t['relative']['max']} (p={p:.3f})")

    if failures:
        return ('rollback' if any('error_rate' in f or 'completion' in f for f in failures) else 'pause', failures)
    return ('promote', [])
```

`alpha = 0.05` is convention; use `0.01` for high-criticality
metrics. **Skip relative checks when not significant** - otherwise
random variance triggers false rollbacks.

## Step 4 - Observation window

Default: **30 minutes**. Pattern:

| Window  | Use                                                                |
|---------|--------------------------------------------------------------------|
| 5 min   | Smoke check only - sanity; not the promote gate.                    |
| 15 min  | Low-traffic services where 30 min wouldn't add sample size.        |
| 30 min  | Default for most services.                                          |
| 1 hour  | High-variance metrics (sparse business KPIs).                       |
| 2 hour  | Pre-major-release; matches the team's release-engineer runbook.     |

Per [canary-release][cr]: the observation window is "early warning
for potential problems before impacting your entire production
infrastructure or user base." Longer = more signal, slower release.

## Step 5 - Per-traffic-share scaling

Canary at 5% traffic with N requests/min collects 1/20 the sample
of baseline at 95% traffic. Adjust the statistical confidence
accordingly:

```python
# Effective sample size correction
canary_share = 0.05   # 5%
baseline_share = 0.95
required_window = window_minutes * (1.0 / canary_share - 1.0)
# A 30-min observation at 5% canary needs the equivalent of 600 min
# at full traffic to match statistical power.
```

For very low canary shares (1%), prefer to bump the share before
verdict (5% canary for 30 min beats 1% canary for 2 hours on
sample-size grounds).

## Step 6 - Output

```markdown
## Canary verdict - `<release>` `<sha>`

**Window:** 30 minutes (14:00-14:30 UTC)
**Canary traffic share:** 5% (12,400 requests)
**Baseline:** main `def456` (235,800 requests)
**Verdict:** ⚠ PAUSE - investigate before promoting

### Per-metric

| Metric                     | Canary    | Baseline  | Δ        | p-value | Verdict |
|----------------------------|-----------|-----------|----------|---------|---------|
| error_rate (%)              | 0.42      | 0.31      | +35.5%   | 0.018   | ⚠ relative threshold tripped |
| p95 latency (ms)            | 245       | 240       | +2.1%    | 0.62    | ✅ within threshold |
| p99 latency (ms)            | 890       | 850       | +4.7%    | 0.41    | ✅ within threshold |
| checkout_completion_rate (%) | 91.2     | 92.1      | -1.0%    | 0.34    | ✅ within threshold |
| signup_rate (%)              | 4.2       | 4.3       | -2.3%    | 0.78    | ✅ within threshold |

### Recommendation

PAUSE. The error rate ratio (1.35x baseline) is statistically
significant (p=0.018) and exceeds the relative threshold (1.5x - 
note: 1.35 < 1.5 absolute but the trend warrants investigation).
Investigate the new error categories before promoting.

### Investigation hand-off

- Top new error types in the canary window:
  - `RateLimitExceeded` (12 occurrences; 0 in baseline) - possible
    new dependency timeout.
  - `NullPointerException at Cart.addItem:42` (3 occurrences; 0 in
    baseline) - likely real regression.

Recommend: investigate the NPE before any promotion decision.
```

## Step 7 - CI / orchestration integration

Wire as a step in the release pipeline:

```yaml
- name: Promote to canary (5%)
  run: ./deploy.sh --canary --share 5

- name: Wait for observation window
  run: sleep 1800   # 30 min

- name: Compute verdict
  id: verdict
  run: |
    python scripts/canary_verdict.py \
      --canary-window "30m" \
      --baseline-window "1h" \
      --thresholds canary-thresholds.yml \
      > verdict.json
    echo "result=$(jq -r .verdict verdict.json)" >> "$GITHUB_OUTPUT"

- name: Promote to 100%
  if: steps.verdict.outputs.result == 'promote'
  run: ./deploy.sh --promote

- name: Pause for human review
  if: steps.verdict.outputs.result == 'pause'
  uses: trstringer/manual-approval@v1
  with:
    approvers: oncall-team
    minimum-approvals: 1

- name: Rollback
  if: steps.verdict.outputs.result == 'rollback'
  run: ./deploy.sh --rollback
```

The verdict is the gate; the human reviews on `pause` (the
ambiguous case); rollback is automatic on clear failure.

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                                  | Fix |
|-------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Eyeballed verdict                                                        | Subjective; varies by who's on-call.                                          | Deterministic verdict (Step 3-6). |
| Absolute thresholds only                                                  | Catches "always bad"; misses "regressed but still under absolute."            | Both absolute + relative (Step 2). |
| Relative threshold without significance test                              | Random variance trips false rollback.                                         | Skip relative when p > alpha (Step 3). |
| Single metric (error rate only)                                           | Latency / business KPI regressions invisible.                                | 5-10 metrics across 3 classes (Step 1). |
| 5-min observation                                                         | Insufficient sample; high variance.                                           | 30-min default (Step 4). |
| Auto-promote without human-review middle ground                            | Edge cases (1.4× baseline, p=0.06) get either stamped through or rolled back. | Three-state verdict (promote / pause / rollback) (Step 7). |
| Same threshold for every service                                          | A 0.5% error rate may be normal for some services, alarming for others.       | Per-service thresholds (Step 2). |

## Limitations

- **Sample size in low-traffic services.** A canary at 1% of low
  traffic produces no signal. Use traffic shadowing or
  pre-production load instead.
- **Noisy metrics.** A flapping monitor can produce false
  rollbacks; pair with metric smoothing (rolling N-min average).
- **Business KPIs lag.** "Checkout completion rate" needs minutes
  to converge; longer windows for KPI-driven decisions.
- **Regional differences.** Per-region canary may have skewed
  traffic; consider per-region verdicts.
- **No semantic understanding.** A 5% latency increase on the most
  critical endpoint matters more than a 50% increase on a healthcheck;
  weight metrics by business value (Step 1 metric class).

## References

- [cr][cr] - Martin Fowler on canary releases: gradual rollout,
  monitoring + rollback, "early warning for potential problems
  before impacting your entire production infrastructure or user
  base."
- [`release-engineer`](../../../qa-roles/agents/release-engineer.md) - orchestrating role agent that calls this skill at the canary
  observation step.
- [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md) - sibling: continuous-in-production verification (different
  cadence, different goal).
- [`feature-flag-experiment-validator`](../feature-flag-experiment-validator/SKILL.md) - sibling: A/B test analysis (different statistical framework
  but related).
