---
name: guardrail-metrics-reference
description: "Pure-reference catalog of guardrail-metric methodology for online controlled experiments. Defines guardrail metrics (metrics that must NOT degrade for an experiment to ship, even if the primary metric improves), the standard guardrail set (latency / errors / engagement / opt-out), the relationship to OEC (Overall Evaluation Criterion) per Kohavi et al., and pre-commitment of the metric set. The quantitative evaluation mechanics (per-metric alert/block thresholds, Bonferroni / Benjamini-Hochberg multiple-comparison correction) live in references/. Use when designing the metric set for a new experiment, auditing existing experiment configs, or reviewing experiment results before ship-decisions."
---

# guardrail-metrics-reference

## Overview

A **guardrail metric** is a measure that must not significantly
degrade for an experiment to ship, even if the primary metric
(the **OEC** - Overall Evaluation Criterion) improves. The
guardrail prevents "we shipped 5% revenue improvement, but
latency 30% worse and we discovered too late." Per Kohavi et al.
*Trustworthy Online Controlled Experiments* (Cambridge Univ.
Press, ISBN 978-1108724265), this is "the most important class
of metrics after the OEC."

This skill is a **pure reference** consumed by the AB-test
validity checklist and the SDK-test skills.

## How to use this reference

1. **Pick the guardrail set** for the experiment's surface (web /
   API / mobile / revenue / trust) from the canonical-set table.
2. **Declare each guardrail** - metric, direction, block threshold -
   in the experiment config *before* launch (see the pre-commitment
   worked example below).
3. **Set two-tier levels** per metric (alert + block), using
   `max(%, absolute)` on fast endpoints - see
   [references/thresholds-and-corrections.md](references/thresholds-and-corrections.md).
4. **Correct for multiple comparisons** across the OEC + N guardrails
   (Bonferroni / FDR) - see
   [references/thresholds-and-corrections.md](references/thresholds-and-corrections.md).
5. **Gate the ship**: block if any guardrail crosses its pre-declared
   block threshold, even when the OEC wins.

## When to use

- Designing the metric set for a new experiment.
- PR review of experiment config changes.
- Pre-ship review: did we have guardrails on the right things?
- Investigating "we shipped X but Y broke" incidents.

## The guardrail taxonomy

Four classes:

| Class | Examples | Why |
|---|---|---|
| **Quality / engineering** | API p95 latency, error rate, crash rate, time-to-first-byte | A degraded experience is bad even with metric wins |
| **Engagement** | DAU, MAU, sessions per user, time on site | Engagement loss is a strategic loss |
| **Revenue** | Gross revenue, conversion rate, ARPU | Direct business impact |
| **Trust** | Opt-out rate, unsubscribe rate, complaint rate | Long-term churn signal |

Microsoft's Experimentation Platform team writes that "we're always
warning our customers to be vigilant when running A/B tests" and that
"we warn them about the pitfalls of even tiny SRMs (sample ratio
mismatches)"
([A/B Interactions: A Call to Relax](https://www.microsoft.com/en-us/research/articles/a-b-interactions-a-call-to-relax/)).
Tiny SRMs (per
`peeking-problem-reference`
sibling concept) and degraded guardrails are the canonical
ship-and-regret sources.

## The OEC vs guardrail relationship

- **OEC** - the metric you want to *improve* (e.g., revenue,
  signups, retention).
- **Guardrail** - the metric you don't want to *break* (e.g.,
  latency, error rate).
- **Driver** - intermediate metric that explains *why* OEC
  changes (e.g., click-through rate explains conversion).

Per Kohavi et al.: the OEC is **one metric** (or a weighted
combination), declared in advance, with a power calculation. The
guardrails are the **rest of the dashboard** - short-term loss is
acceptable if within bounds, but a significant degradation
**blocks ship**.

## Standard guardrails - the canonical set

| Domain | Guardrail | Direction |
|---|---|---|
| Web app | TTFB, LCP, INP (Core Web Vitals) | Should not increase |
| API | p95 / p99 latency, error rate, 5xx rate | Should not increase |
| Mobile | Crash rate, ANR rate, app start time | Should not increase |
| Engagement | DAU, sessions / user, retention day 7 | Should not decrease |
| Revenue | Gross revenue, average order value, conversion | Should not decrease |
| Trust | Opt-out rate, complaint rate, refund rate | Should not increase |

Per Kohavi et al.: **always include a quality guardrail**
(latency / error) - the most-missed category in real
experiments.

## Pre-commitment vs post-hoc

Guardrails must be **declared before** the experiment starts.
Per Kohavi et al.: post-hoc guardrails are p-hacking - if you
look at 50 metrics, some will spuriously fail.

**Worked example** - declare every guardrail in the experiment
config before the experiment starts:

```yaml
experiment: feed-ranking-v3
oec: ctr_per_session
power:
  primary_metric: ctr_per_session
  expected_effect: +1.5%
  alpha: 0.05
  beta: 0.20
guardrails:
  - metric: api_p95_latency
    direction: not-increase
    block_threshold: +10% or +50ms
  - metric: dau
    direction: not-decrease
    block_threshold: -1%
  - metric: error_rate
    direction: not-increase
    block_threshold: +0.1pp absolute
```

The `block_threshold` on `api_p95_latency` uses the
`max(%, absolute)` rule so a fast endpoint can't ship a small
absolute regression that a percentage alone would miss.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| OEC + zero guardrails | Cargo-cult "ship the metric improvement" | Always include latency + error |
| Guardrails added after seeing results | p-hacking variant; non-causal | Pre-commit guardrails |
| Same alpha across OEC + 50 guardrails | Inflated false-positive rate | Bonferroni / FDR correction |
| Guardrail thresholds invented post-hoc | Move the goalposts | Pre-commit thresholds |
| Single block-threshold (no alert level) | Pass / fail; no surface for "investigate" | Two-tier: alert + block |
| Guardrail in % only on fast endpoint | 10% of 10ms = nothing; ship a 9ms regression | Use `max(% , absolute)` |
| No mobile-specific guardrails on a mobile experiment | Web-shaped metrics miss crash / ANR | Per-surface guardrails |
| Re-using last experiment's guardrails verbatim | New experiment, new failure modes | Per-experiment review |

## Limitations

- **Guardrails are negative-defined.** They prevent
  ship-and-regret; they don't measure success.
- **Latency-as-guardrail interacts with caching.** A cache hit
  rate shift changes apparent latency without product impact.
- **Engagement guardrails are noisy.** DAU varies with day-of-
  week, seasonality. Require longer experiments to surface
  signal.
- **Pre-commitment is hard to enforce.** Code review of
  experiment configs is the only practical gate.
- **Guardrail-only dashboards miss the bigger picture.** Pair
  with a counterfactual analysis dashboard.

## Setting thresholds and correcting alpha - deep reference

Once the guardrail set is declared, the quantitative evaluation
rules live in one companion reference:

- **Thresholds + multiple-comparison correction** - per-metric
  alert/block levels (with the `max(%, absolute)` rule) and
  Bonferroni / Benjamini-Hochberg correction across the OEC + N
  guardrails:
  [references/thresholds-and-corrections.md](references/thresholds-and-corrections.md).

## References

- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments*
  (Cambridge University Press, 2020). ISBN 978-1108724265.
- Microsoft Experimentation Platform:
  [microsoft.com/en-us/research/group/experimentation-platform-exp/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/).
- Quantitative evaluation mechanics (with their citation):
  thresholds + multiple-comparison correction in
  [references/thresholds-and-corrections.md](references/thresholds-and-corrections.md).
- Companion catalogs:
  `peeking-problem-reference`,
  `ab-test-validity-checklist`.
- Consumed by:
  `statsig-test`,
  `optimizely-test`,
  `vwo-test`,
  `amplitude-experiment-test`.
