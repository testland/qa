---
name: experiment-results-interpreter
description: "Interprets the results of a valid online controlled experiment, one whose harness, SRM, and telemetry have already been confirmed. Covers the distinction between practical and statistical significance, reading confidence intervals instead of binary p-values, novelty and primacy week-over-week decay that causes post-ship reversion, interaction effects from concurrent experiments, Simpson's paradox in segmented results, and the ordered guardrail-check sequence required before a ship decision. Use when a data scientist or PM is ready to draw conclusions from an experiment whose telemetry and randomisation have already passed the ab-test-validity-checklist. Distinct from ab-test-validity-checklist (harness setup and SRM detection) and from interaction-effect overlap auditing during experiment design."
metadata:
  keywords: "experiment, a/b testing, statistical significance, practical significance, confidence intervals, novelty effect, primacy effect, interaction effects, simpsons paradox, guardrails, results interpretation"
---

# experiment-results-interpreter

## Overview

The `ab-test-validity-checklist` skill confirms that an experiment
was run correctly - clean SRM, honest peeking discipline, pre-declared
OEC. This skill covers the **next question**: given a valid experiment,
what does the result actually mean, and is it safe to ship?

The two most common failure modes at this stage, per Kohavi, Tang, Xu
*Trustworthy Online Controlled Experiments* (Cambridge Univ. Press,
2020, ISBN 9781108724265), are:

1. Shipping a result that is statistically significant but not
   practically meaningful.
2. Shipping a result that will not persist because it reflects
   novelty, primacy, or interaction artefacts rather than genuine
   long-term user value.

This skill is a **pure reference** for data scientists and PMs reading
final experiment dashboards.

## When to use

- Reading the results of an experiment that has reached its pre-declared
  sample size or end date.
- Preparing the ship/no-ship decision document.
- Auditing a past ship decision that produced unexpected post-launch
  outcomes.
- Coaching a PM or analyst who is over-indexing on p-values or
  under-checking guardrails.

## How to use

Work through the six interpretation steps in order. Each step has a
hard stop: if a step blocks, do not proceed to the next.

---

## Step 1 - Practical significance before statistical significance

A statistically significant effect can still be too small to matter:
results "may be statistically significant but not practically
significant" (Nielsen Norman Group, [sources](references/sources.md)).

**The minimum practically significant effect (MPSE)** must be declared
in the pre-registration (`proposal.yml`). At read-time:

| Question | How to answer |
|---|---|
| Is the point estimate above the MPSE? | Compare OEC lift to the pre-declared threshold |
| Is the confidence interval entirely above the MPSE? | If the lower bound falls below the MPSE, treat as inconclusive |
| Would a 0.1% conversion lift justify the maintenance cost? | Engineering and product judgement, not statistics |

A statistically significant result with a point estimate well below the
MPSE is a **no-ship** unless the maintenance cost is zero and the
direction is consistent with strategy.

---

## Step 2 - Confidence intervals, not just p-values

A 95% confidence interval gives the plausible range of the true effect -
"both directionality and magnitude of effects simultaneously" (Statsig,
[sources](references/sources.md)) - which a binary p-value cannot.

Reading a result:

| CI position | Interpretation |
|---|---|
| Entirely above zero and above MPSE | Strong positive - candidate for ship |
| Entirely above zero, partially below MPSE | Positive but magnitude uncertain - extend or accept lower bound as the working estimate |
| Crosses zero | Inconclusive; do not ship on this signal |
| Entirely below zero | Negative treatment effect - do not ship |

**Width matters.** A narrow CI means high power and a precise estimate;
a wide CI means the experiment was underpowered, so extending runtime or
pooling more traffic will narrow it. Variance-reduction techniques (CUPED)
narrow the CI without inflating the false-positive rate (Microsoft ExP,
[sources](references/sources.md)) - prefer platforms that apply it by
default.

Do not convert CI edges back to p-values to decide - the CI is the
complete picture.

---

## Step 3 - Novelty and primacy effects

A statistically and practically significant result in week 1 may not
persist. Two opposing artefacts corrupt early-period estimates:

**Novelty effect:** users react to the mere newness of a change;
engagement (clicks, session length) inflates above the true long-run
level, then decays.

**Primacy effect (resistance to change):** new UI or workflows initially
hurt task-completion because users must relearn existing habits; the
treatment appears worse early, then improves as users adapt. Kohavi et
al. note novelty and primacy are "significant causes of treatment effects
changing over time but are not the sole causes"
([sources](references/sources.md)).

Detection and mitigation:

| Signal | Method |
|---|---|
| Week 1 lift much larger than week 2+ | Segment metric by experiment week; compute week-over-week trend |
| Effect reversal after ship | Look for Kendall's tau trending toward zero over 14+ day window |
| New-user cohort differs from returning-user cohort | Segment by `first_exposure_date` - new users see no novelty decay |

Microsoft ExP found "14-day surprises" - the second week's estimate
falling outside the first week's 3-sigma CI - at roughly 4% of
experiments, far more than the theoretical rate
([sources](references/sources.md)). **Minimum run time: two full weeks**
before drawing ship conclusions from experiments that change UI patterns;
feature launches with no UX learning curve may need only one week.

---

## Step 4 - Interaction effects

An experiment running concurrently with other experiments may have its
treatment effect inflated, deflated, or reversed by interference.

Two types:

**Between-experiment interaction:** variant A of experiment X and
variant B of experiment Y are assigned to overlapping user populations.
If the two treatments interact (positively or negatively), the OEC
measured for X is partly caused by Y's presence (Microsoft ExP, "A/B
Interactions: A Call to Relax", [sources](references/sources.md)).

**Treatment spillover:** a social or marketplace product where treating
some users changes outcomes for untreated users in the same experiment
(network effects). The control group is contaminated; the measured
effect is attenuated. Kohavi et al. (ISBN 9781108724265) categorise
this as a **stable unit treatment value assumption (SUTVA) violation**.

Detection checklist:

| Check | Pass criterion |
|---|---|
| Concurrent experiment audit | List all experiments running in the same user population during the experiment window |
| Mutual-exclusion / interaction check | For each concurrent experiment: did assignment overlap create a joint condition that was never intended? |
| SUTVA plausibility | Is the metric a per-user metric (e.g., clicks) or a network metric (e.g., messages sent to others)? Network metrics need holdout or cluster-level randomisation |

If a significant interaction is identified, the measured effect is
confounded. Options: (a) isolate with mutual exclusion and re-run,
(b) include the interaction term in a factorial model, (c) block ship
pending analysis.

---

## Step 5 - Simpson's paradox

The aggregate OEC lift may be positive while every segment shows
a negative or neutral lift - or vice versa. This is Simpson's paradox.

Simpson's paradox is when "a trend appears in several groups of data but
disappears or reverses when the groups are combined" (Wikipedia,
[sources](references/sources.md)).

In A/B testing, it surfaces when:

- Traffic allocation differs across segments (e.g., mobile gets 60% of
  control but 40% of treatment due to a holdout policy or ramp-up).
- The OEC baseline differs strongly across segments (e.g., power users
  convert at 12%, new users at 2%).
- The treatment effect differs in sign across segments.

Detection:

```text
For each major segment (device, country, user-cohort, new vs returning):
  1. Compute per-segment OEC lift and CI.
  2. Verify direction is consistent with the aggregate result.
  3. Check that per-segment traffic allocation matches the overall ratio.
```

If direction flips in a large segment: the aggregate result is
misleading. Segment-level results are the truth; the aggregate is an
artefact of unequal allocation. **Do not ship on a positive aggregate
with a negative segment that represents > 20% of users.**

The `ab-test-validity-checklist` Step 7 includes a "segment-stability"
gate for this reason - this skill provides the interpretive depth behind
that gate.

---

## Step 6 - Guardrail check before ship

Per `guardrail-metrics-reference`: no ship decision is valid without
confirming that no guardrail metric has breached its block threshold.

Ordered check:

```text
1. Load the guardrail dashboard for the experiment.
2. For each declared guardrail metric:
   a. Is the observed change within the alert threshold? (investigate, but not blocked)
   b. Does the observed change breach the block threshold? (STOP - no-ship)
3. If any guardrail is on alert: document the finding and make an
   explicit call (accepted risk + rationale OR extend experiment).
4. If all guardrails are within alert thresholds: proceed to ship.
```

Common guardrail check failures before ship:

| Anti-pattern | Consequence |
|---|---|
| OEC positive, latency guardrail in alert band, ship anyway | Regression ships; support tickets spike |
| Checking guardrails at 80% of sample (early) | Underpowered - guardrail CIs wide; false safe signal |
| Ignoring guardrails with wide CIs because "p > 0.05" | Wide CI is not clearance; it means underpowered, not unaffected |
| Trust guardrail omitted (opt-out rate) | Long-term retention damage, not captured by OEC |

Measuring only the OEC can "disregard important information" (Nielsen
Norman Group, [sources](references/sources.md)) - always check guardrails
alongside it.

---

## Example

**Scenario:** Redesigned onboarding flow experiment. Declared OEC:
7-day activation rate. MPSE: +0.5pp absolute. Alpha 0.05, 80% power.
Ran 14 days. Result reads: `lift = +1.2pp (95% CI: +0.3pp, +2.1pp)`.

**Step 1 - Practical significance:** Point estimate +1.2pp > MPSE
+0.5pp. Lower CI bound +0.3pp is below MPSE. Minimum realistic effect
is 0.3pp - marginal. Discuss with product whether 0.3pp justifies the
complexity.

**Step 2 - CI read:** CI entirely above zero; statistically significant.
Width (1.8pp) is moderate. Acceptable - not underpowered.

**Step 3 - Novelty check:** Week 1 lift was +2.1pp; week 2 lift was
+0.9pp. Declining trend. Novelty effect likely inflating week 1. Use
week 2 estimate (+0.9pp) as the stable-state estimate - still above
MPSE.

**Step 4 - Interaction:** No other experiment running in onboarding
funnel. SUTVA: metric is per-user (not network). Clear.

**Step 5 - Simpson's:** Mobile segment (45% of traffic): lift +0.7pp.
Desktop segment (55%): lift +1.6pp. Directions consistent; no paradox.

**Step 6 - Guardrails:** API p95 latency +3% (alert threshold +5% or
+50ms block). Within alert, no breach. DAU stable. Opt-out rate flat.
All green.

**Ship decision:** Ship, citing week-2 stable estimate +0.9pp and
clean guardrails. Document novelty decay in the ship note.

---

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Ship on week-1 lift alone | Novelty effect inflates early results; may revert | Run at least 2 weeks; compare week 1 vs week 2 |
| Treat p-value < 0.05 as "the result" | Binary; ignores magnitude, direction, and CI width | Read the CI; compare CI to MPSE |
| Skip segment analysis | Simpson's paradox hidden in aggregate | Always segment by device, new vs returning, country |
| Ignore guardrail alerts as "not significant" | Wide CI is not clearance | Investigate every alert before ship |
| Ship on practical but not statistical significance | Effect may be noise at that magnitude | Wait for power target |
| Treat post-ship metric as experiment validation | Observational data after ship mixes causation | Experiment result is causal; post-ship is not |
| Combine result across concurrent experiments without interaction check | Confounded OEC | Audit the concurrent experiment list |
| Ship "because the direction is right" on a CI that crosses zero | Inconclusive result | Extend runtime or accept null |

---

## Limitations

- **This skill does not validate the experiment harness.** SRM,
  telemetry, and peeking discipline belong in `ab-test-validity-checklist`.
  This skill assumes the harness is valid.
- **Novelty / primacy detection requires two or more weeks of data.**
  Products under launch pressure may not have it.
- **Interaction effects are hard to detect without factorial design.**
  Audit-based detection (Step 4) is heuristic, not conclusive.
- **Simpson's paradox analysis surfaces the descriptive pattern,
  not the causal explanation.** Requires domain knowledge to resolve.
- **Guardrail thresholds are pre-declared.** Post-hoc threshold
  adjustment to clear a guardrail is p-hacking; this skill cannot
  prevent that without governance enforcement.

---

## References

Full source attributions and verbatim quotes:
[references/sources.md](references/sources.md). Primary source is Kohavi,
Tang, Xu, *Trustworthy Online Controlled Experiments* (Cambridge Univ.
Press, 2020, ISBN 9781108724265); companion catalogs
`ab-test-validity-checklist`, `guardrail-metrics-reference`,
`peeking-problem-reference`.
