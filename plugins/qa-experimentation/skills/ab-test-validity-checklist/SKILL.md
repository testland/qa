---
name: ab-test-validity-checklist
description: "Workflow-driven skill that builds an A/B test validity checklist from an experiment proposal. Walks through the canonical validity gates (pre-registration of OEC + power calc + guardrails, randomization unit + SRM check, assignment integrity, telemetry correctness, peeking discipline per peeking-problem-reference, novelty/primacy assessment, post-experiment SRM re-check, results-interpretation guardrails per Kohavi et al.) and emits a per-experiment checklist + a sign-off form. Use when launching a new experiment, auditing an existing one, or building experimentation governance. Composes guardrail-metrics-reference + peeking-problem-reference."
---

# ab-test-validity-checklist

## Overview

This skill produces the **pre-flight + post-flight** validity
checklist for an A/B test. Each item is a gate; failing one
without explicit acknowledgment invalidates the experiment.

Per Kohavi et al. *Trustworthy Online Controlled Experiments*
(ISBN 978-1108724265): "More than 50% of experiments in practice
are invalidated by issues the checklist catches."

The output: a per-experiment markdown checklist + a sign-off
form for the experiment owner.

## When to use

- Launching a new experiment.
- Auditing an experiment that produced surprising results.
- Building experimentation governance / a peer-review process.
- PR review of experiment configuration changes.

## Step 1 - Pre-registration

Document **before launch**:

| Item | What |
|---|---|
| OEC | The single metric (or weighted combination) to improve |
| Power | Expected effect size, sample size, alpha, beta |
| Guardrails | Per [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md) - list each + threshold |
| Randomization unit | User / session / device / cookie / IP / tenant |
| Allocation | Percentages per arm; rules for ramp-up |
| Look schedule | Pre-declared days; per [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md) |
| Sequential method | Fixed / Pocock / O'Brien-Fleming / always-valid |
| Stop-early rules | What signals stop (loss on OEC, blocking guardrail) |

Commit this to the repo as `experiments/<id>/proposal.yml`.
Any post-launch change requires explicit team approval.

## Step 2 - Sample Ratio Mismatch (SRM)

Per Microsoft Experimentation Platform research (KDD 2019 paper
"Diagnosing Sample Ratio Mismatch in Online Controlled
Experiments"): if the observed allocation (e.g., 50.3% A,
49.7% B) deviates significantly from intended (50% / 50%), the
experiment is **invalid until root cause is found**. SRM signals:

- Logging bugs (assignments not all logged)
- Bot filtering (different ratios filtered per arm)
- Redirects (one variant redirects more)
- Telemetry drops (one variant has heavier client → more drops)
- Randomisation bugs (hash collisions)

Chi-square test:

```
χ² = Σ ((observed_i - expected_i)² / expected_i)
```

For 2 arms at 50/50 with N=1e6 users:

- Expected: 500k each
- Observed: 503k / 497k
- χ² = (3000²/500000) + (3000²/500000) = 36
- p-value: < 0.0001

Threshold: **p < 0.0001 is the canonical SRM-detection
boundary** (the chi-square is super-sensitive at large N; this
threshold prevents false-positive SRM alarms).

If SRM is detected: **stop ship discussion; root-cause first**.
Use [`sample-ratio-mismatch-detector`](../../agents/sample-ratio-mismatch-detector.md).

## Step 3 - Assignment integrity

Tests for the assignment SDK / service:

| Test | Pattern |
|---|---|
| Determinism | Same (user, experiment) → same arm across calls |
| Sticky assignment | User reassigned only if experiment reconfigured |
| Cross-experiment independence | Assignment to expt A doesn't bias expt B |
| Bot exclusion consistent | If bots filtered, filter applies before assignment |
| Latency | Assignment SDK adds < 5ms to request path |

These tests live in the SDK-specific test skills per
[`statsig-test`](../statsig-test/SKILL.md),
[`optimizely-test`](../optimizely-test/SKILL.md), etc.

## Step 4 - Telemetry correctness

Verify the **event firing** matches the proposal:

- Conversion events fire exactly once per user per
  conversion-eligible session.
- Exposure events fire for everyone who could see the variant
  (not just those who actually saw it - that's a different
  measure, "treatment effect on the treated").
- Guardrail metrics are queryable against the experiment
  partition (variant ID joined to event stream).

## Step 5 - Peeking discipline

Per [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md):

| Rule | Test |
|---|---|
| If sequential / always-valid: p-value valid at any look | Dashboard p-value uses the valid math |
| If fixed-horizon: no early-stop UI | "Ship" button disabled until N reached |
| If Pocock/OBF: look schedule pre-declared | Dashboards lock looks outside the schedule |

## Step 6 - Novelty / primacy effects

Per Kohavi et al.: users react differently to novel UX. Novelty
inflates the early-period effect; primacy depresses it. Mitigation:

- Run for ≥ 2 weeks (typical mature-effect period).
- Segment results by "first exposure vs returning to treatment."
- For long-running tests, segment by week to spot trend
  reversal.

## Step 7 - Post-experiment validation

Before ship:

| Gate | Pass criterion |
|---|---|
| Pre-registration honoured | OEC / guardrails / unit / schedule unchanged since launch |
| SRM clean | p > 0.0001 on the chi-square (Step 2) |
| OEC significant under the declared method | Sequential / always-valid / fixed-horizon p-value |
| All guardrails within thresholds | Per [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md) |
| Multiple-comparison corrected | Bonferroni / BH if many metrics |
| Novelty assessment | Effect persisting in week 2+ |
| Segment-stability | Effect direction consistent across major segments (no Simpson's paradox) |
| Trust metric stable | Opt-out / complaint rate not up |

Document each pass in `experiments/<id>/result.md` with the
specific numbers.

## Step 8 - Emit the checklist

The output of this skill: a markdown checklist + sign-off form.

```markdown
# Experiment <id> — Validity Checklist

## Pre-registration (signed by: <owner>, date: <YYYY-MM-DD>)

- [ ] OEC declared: <metric>
- [ ] Power calc: N=<X>, alpha=0.05, beta=0.20, MDE=<Y>%
- [ ] Guardrails declared: <list with thresholds>
- [ ] Randomization unit: <user_id / device_id>
- [ ] Allocation: <50/50>
- [ ] Look schedule: <Pocock 5 looks at days 2,4,7,10,14>
- [ ] Stop-early rules: <on OEC reaching alpha-threshold>

## During experiment

- [ ] SRM check: chi-square p > 0.0001 ([result: <p>])
- [ ] Assignment integrity tests passing
- [ ] Telemetry validated

## Post-experiment (signed by: <reviewer>, date: <YYYY-MM-DD>)

- [ ] Pre-registration honoured (no scope changes)
- [ ] SRM final check: p > 0.0001 ([result])
- [ ] OEC significant (p=<X>; method: <Pocock>)
- [ ] All guardrails within thresholds:
    - api_p95_latency: +<X>% / +<Y>ms — <status>
    - dau: <X>% — <status>
- [ ] Multiple-comparison adjusted (method: <Bonferroni / BH>)
- [ ] Novelty assessment: effect persists week 2+? <yes / no>
- [ ] Segment stability: direction consistent? <yes / no>
- [ ] Trust metric stable? <yes / no>

## Ship decision: <ship / no-ship / extend>

Reasoning: <one paragraph>

Sign-off: <name>, <date>
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Post-hoc OEC change | "We found a better metric" = p-hacking | Pre-register |
| Skip SRM check | Invalidates results without detection | Always run chi-square pre-ship |
| Decision before checklist completion | Ship-then-validate is rejected by trusted-experiments framework | Block ship on incomplete checklist |
| Reviewer = experiment owner | Self-sign-off; no second pair of eyes | Different sign-off than owner |
| Skip novelty assessment | Effect disappears post-ship | Look at week-2+ subset |
| Skip segment stability | Simpson's paradox: total positive, per-segment negative | Audit by major segments |
| Treat the checklist as paperwork | Items checked without verification | Each item produces evidence (number, link, calc) |

## Limitations

- **Checklist is necessary, not sufficient.** Quality of the
  underlying telemetry + assignment logic matter.
- **Multiple-comparison corrections are conservative.** May reject
  real wins.
- **Novelty assessment needs ≥ 2 weeks.** Pressure to ship fast
  conflicts.
- **Doesn't catch ecosystem effects.** Cross-experiment
  interaction, carry-over, etc. require global statistics.

## References

- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments*
  (Cambridge Univ. Press, 2020). ISBN 978-1108724265.
- KDD 2019 paper "Diagnosing Sample Ratio Mismatch"
  (Microsoft Research).
- Microsoft Experimentation Platform articles:
  [microsoft.com/en-us/research/group/experimentation-platform-exp/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/).
- Companion catalogs:
  [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md),
  [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md).
- Operationalised:
  [`statsig-test`](../statsig-test/SKILL.md),
  [`optimizely-test`](../optimizely-test/SKILL.md),
  [`vwo-test`](../vwo-test/SKILL.md),
  [`amplitude-experiment-test`](../amplitude-experiment-test/SKILL.md),
  [`sample-ratio-mismatch-detector`](../../agents/sample-ratio-mismatch-detector.md).
