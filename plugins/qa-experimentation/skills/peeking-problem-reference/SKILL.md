---
name: peeking-problem-reference
description: "Pure-reference catalog of the peeking problem in online A/B testing. Defines the problem (repeatedly looking at experiment results inflates the false-positive rate above the declared alpha because each look is a separate test), the canonical mitigations (fixed-horizon test with pre-declared sample size; sequential testing with alpha-spending functions e.g., O'Brien-Fleming, Pocock; always-valid inference / mSPRT per Johari et al.), and the policy choices (data-peek schedule, stop-early thresholds, decision-time guard rails). Use when designing an experimentation platform's stop-early policy or auditing why a result was declared significant."
---

# peeking-problem-reference

## Overview

In classical (fixed-horizon) hypothesis testing, the test is run
once, on a pre-declared sample size, at a pre-declared alpha
(typically 0.05). Looking at the data and stopping when
significance is reached **before** the pre-declared end inflates
the false-positive rate well above alpha - sometimes to 30%+ at
naive 0.05.

This is the **peeking problem**. Per Kohavi et al. *Trustworthy
Online Controlled Experiments* (ISBN 978-1108724265): "Repeated
significance testing is one of the most common mistakes in
practical A/B testing."

This skill is a **pure reference** consumed by the AB-test
validity checklist and SRM detection.

## How to use this reference

1. **Choose the analysis regime up front**: fixed-horizon (no
   peeking) or a peek-protected method (sequential alpha-spending
   or always-valid / mSPRT) - see the three corrections below.
2. **If you must stop early**, pick a sequential schedule (Pocock
   vs O'Brien-Fleming) or mSPRT, and pre-declare it before launch.
3. **Lock the look schedule**: hourly dashboards and "where are we
   now?" checks are not decision looks - only the pre-declared
   schedule is.
4. **Read the peek-protected p-value at the gate**, never the naive
   mid-experiment p-value.
5. **Stack corrections**: if the experiment also has guardrails,
   combine the peeking correction with the guardrail (Bonferroni /
   FDR) correction - see the worked example below.

## When to use

- Designing the stop-early policy for an experiment platform.
- Auditing an "early ship" decision - was the math valid?
- PR review of a new experiment dashboard / analysis flow.
- Investigating "we shipped, then the effect disappeared."

## Why naive peeking inflates false positives

At alpha=0.05, the test is calibrated to give a 5% false-positive
rate **if you look once**. If you look every day for 30 days and
ship at the first significance - at each look, the test has a
fresh chance to spuriously hit. The total false-positive rate
compounds.

Per Microsoft Experimentation Platform research
([microsoft.com/en-us/research/group/experimentation-platform-exp/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/)):
common patterns that surface this - dashboards that update
hourly, "early-stop" buttons in experimentation UIs, manager
asks for "where are we now?" mid-experiment.

## Three corrections

### 1. Fixed-horizon test (pre-declared)

Decide N in advance via power analysis; collect N samples; do
one test; ship or not. **No peeking, no early stop.**

Pros: standard p-value interpretation, full alpha budget on the
declared test.

Cons: must wait for N. Cannot stop early on obvious winners
(opportunity cost) or obvious losers (continuing risk).

### 2. Sequential testing with alpha-spending

Pre-commit to multiple looks, each with a fraction of the alpha
budget. Two canonical schedules:

| Schedule | Pattern |
|---|---|
| **Pocock** | Equal alpha at each look; symmetric |
| **O'Brien-Fleming** | Tiny alpha early, large alpha late; conservative early-stop |

Implementation: declare `K` looks in advance; at each look
`k`, the rejection threshold is computed from the cumulative
alpha spent (per the schedule). If the test stat exceeds the
threshold, stop.

Math: `Σ alpha_k = alpha_total`.

### 3. Always-valid inference / mSPRT

Per Johari, Pekelis, Walsh "Always Valid Inference" (paper
ID: arXiv:1512.04922) and related work, the **mixture sequential
probability ratio test** (mSPRT) lets you peek **arbitrarily
often** without inflating alpha. The trade-off: less powerful per
sample than fixed-horizon.

This is the foundation of "valid sequential" experimentation in
Optimizely / Statsig / similar - they expose p-values that are
**always valid** under continuous monitoring.

Per Optimizely's sequential-testing docs (a derivative of mSPRT):
the platform allows the user to look at any time; the p-value
remains valid.

## Visual intuition

| Approach | Look 1 (day 1) | Look 30 (day 30) | Final |
|---|---|---|---|
| Naive fixed-horizon | Don't look | Don't look | Look once at day 30, alpha=0.05 |
| Fixed-horizon + early-stop = WRONG | "Hmm 0.04, ship!" | n/a | False positive risk inflated |
| Pocock 5 looks | alpha=0.016 (=0.05/√5 ish) | alpha=0.016 | Sum ≤ 0.05 |
| mSPRT / always-valid | Look any time; p-value valid | Look any time | Same alpha guarantee |

## Decision boundary in tests

Tests for an experimentation platform must verify:

| Behaviour | Test |
|---|---|
| Naive p-value not auto-significant on peek | Run synthetic A/A test; look 100×; ≤5% false positives |
| Sequential adjustment correctly enforced | At look N, threshold matches the declared schedule |
| Stop-early threshold consistent with declared method | Pocock vs O'Brien-Fleming asymmetric on early vs late |
| Always-valid p-value never decreases below declared alpha | Simulate; check never-exceeds-alpha |
| Ship-decision gate enforces the peek-protected p-value | Mock low-p naive p, observe gate rejection |

## Worked example - stacking peeking + guardrail corrections

Per `guardrail-metrics-reference`:
the guardrail-correction (Bonferroni / FDR) **stacks** with the
peeking correction. Don't apply only one if both are needed.

For an experiment with one OEC, 10 guardrails, and 5 looks:

| Naive alpha per look per metric | 0.05 |
|---|---|
| With 5 looks alpha-spending | 0.011 per look |
| With Bonferroni for 11 metrics at each look | 0.001 per (look, metric) |

The strict math is rarely applied this thoroughly; pragmatically
most platforms apply sequential + per-metric alpha but not
formal multi-comparison correction across guardrails.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Peek + early-stop on naive p-value | False positive rate explodes | Use sequential / always-valid |
| Dashboards refresh hourly, treated as "data" | Implicit peeking; humans see + react | Lock decisions to pre-declared look schedule |
| Stop-loss without symmetric stop-win | One-sided peeking still inflates | Symmetric or pre-committed |
| "We'll just look once at midpoint" | One unscheduled look = one inflation event | Either fixed-horizon OR sequential - not "fixed + one peek" |
| Different metric uses different schedule | Coordination mismatch; inconsistent alpha | One schedule per experiment |
| Re-running an experiment after p=0.06 to "find significance" | Garden of forking paths | Pre-commit; accept null result |
| Stop-early on a guardrail alone | Guardrails should be assessed at horizon | Stop-early only on OEC (with sequential math) |
| Treating "p=0.04 mid-experiment" as significant | Naive interpretation | Use the sequential / always-valid p-value |

## Limitations

- **Always-valid inference is less powerful.** Same effect size
  requires more samples than fixed-horizon. Trade convenience
  for sample efficiency.
- **Sequential methods require pre-declared schedules.** The
  alpha-spending isn't "fluid"; the schedule is fixed in advance.
- **Multiple-testing correction across many metrics is brutal.**
  Per-metric alpha after Bonferroni × 20 metrics = 0.0025.
- **Operator behaviour is the real bottleneck.** Math is robust
  to peeking; humans are not. Education + UI gating matter.
- **Doesn't help with novelty / primacy effects.** Statistical
  validity doesn't fix "users react to change, then revert."

## References

- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments*
  (Cambridge Univ. Press, 2020). ISBN 978-1108724265, ch. on
  sequential testing.
- Johari, Pekelis, Walsh. *Always Valid Inference: Continuous
  Monitoring of A/B Tests* (arXiv:1512.04922).
- Microsoft Experimentation Platform:
  [microsoft.com/en-us/research/group/experimentation-platform-exp/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/).
- Companion catalogs:
  `guardrail-metrics-reference`,
  `ab-test-validity-checklist`.
- Consumed by:
  `statsig-test`,
  `optimizely-test`,
  `vwo-test`,
  `amplitude-experiment-test`.
