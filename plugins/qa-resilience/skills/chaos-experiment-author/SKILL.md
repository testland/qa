---
name: chaos-experiment-author
description: "Build-an-X workflow for a chaos experiment per the Principles of Chaos Engineering - defines steady-state hypothesis, picks the variables (real-world events: network latency, node failure, region outage), sets the blast radius (which percentage / namespace / user cohort), automates execution, and emits the verdict (steady-state held / didn't hold). Includes the five-check pre-flight validation of the steady-state hypothesis (measurable, baselined, SLI-backed tolerance, defined measurement window, metric moves under the fault) with hard-reject rules, and routes the tool choice: Chaos Mesh has its own standalone skill, while LitmusChaos and Gremlin setup live in this skill's references. Use to scope and pre-flight-validate a chaos experiment before running it via Chaos Mesh / Litmus / Gremlin / Toxiproxy."
---

# chaos-experiment-author

## Overview

Per [chaos-principles][cp], chaos engineering is "the discipline of experimenting
on a system in order to build confidence in the system's capability to withstand
turbulent conditions in production." This skill walks the team through authoring
an experiment that honors the five principles - steady-state hypothesis,
real-world events, running in production, continuous automation, and minimized
blast radius - each applied in the step below that uses it.

[cp]: https://principlesofchaos.org/

## When to use

- A new resilience requirement is documented (retry, fallback,
  circuit-breaker); the experiment verifies it.
- An incident postmortem identified "we should have tested for X
  failure"; this builds the experiment.
- Pre-production sign-off requires a chaos test pass.
- Recurring monthly / quarterly: scheduled experiments.

## Step 1 - Define the steady-state hypothesis

Per [chaos-principles][cp] principle 1: focus on **measurable
output**. The hypothesis must be a number, not a feeling:

```yaml
# experiments/checkout-network-latency.yaml
hypothesis:
  steady_state:
    metric: checkout_completion_rate
    threshold: ">= 95%"
    measured_over: "5 minutes"
    source: "datadog dashboard 'checkout-success'"
```

Bad hypotheses:
- "The system stays up." (unmeasurable)
- "Performance doesn't degrade." (unmeasurable; what's "degrade"?)
- "Users have a good experience." (subjective)

Good hypotheses:
- "Checkout completion rate stays >=95%."
- "p95 API latency stays <=300ms."
- "Sentry error rate stays <0.5%."

## Step 2 - Pick a real-world event to inject

Per [chaos-principles][cp] principle 2: vary real-world events.
Don't inject "anything"; inject what could plausibly happen - events the team
has already seen in real incidents or realistically expects. The catalog of
event classes (network, compute, storage, time, region/zone, dependency,
configuration) with concrete examples is in
[references/experiment-authoring.md](references/experiment-authoring.md).

## Step 3 - Set the blast radius

Per [chaos-principles][cp] principle 5: minimize blast radius.

```yaml
blast_radius:
  scope: "1% of pods in the staging namespace"
  duration: "5 minutes"
  abort_conditions:
    - "Sentry error rate exceeds 2%"
    - "PagerDuty incident raised"
    - "Manual abort signal"
```

Start small; expand as confidence grows.

## Step 4 - Pick the chaos tool

**Default: `chaos-mesh` for Kubernetes stacks** - CNCF-graduated, broadest fault catalog (network / pod / IO / time / stress), declarative CRDs that compose with the experiment YAML in Step 1. Use LitmusChaos ([references/litmus.md](references/litmus.md)) when the team wants a ChaosCenter web UI and ChaosHub catalog; Gremlin ([references/gremlin.md](references/gremlin.md), deep operations in [references/gremlin-advanced-operations.md](references/gremlin-advanced-operations.md)) for commercial multi-platform support outside Kubernetes; `toxiproxy-chaos` when the failure surface is purely TCP-level.

The tool's syntax (CRD, attack config, etc.) goes alongside the
experiment YAML.

## Step 5 - Automate

Per [chaos-principles][cp] principle 4: automate continuously.

```yaml
# .github/workflows/chaos-monthly.yml
on:
  schedule:
    - cron: '0 4 1 * *'   # 1st of every month, 4am UTC

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - run: |
          kubectl apply -f experiments/checkout-network-latency.yaml
          # Wait for completion
          kubectl wait --for=condition=Complete chaosengine/checkout-network-latency --timeout=10m
          # Check verdict
          kubectl get chaosengine/checkout-network-latency -o jsonpath='{.status.experimentStatus.verdict}'
```

Schedule per the team's appetite - monthly for new experiments,
weekly for established ones, on-demand for incident reproduction.

## Step 6 - Run in production?

Per [chaos-principles][cp] principle 3: experiments in production
are the gold standard. But:

| Stage          | Use                                                 |
|----------------|-----------------------------------------------------|
| Pre-prod (staging) | Initial experiment runs; confidence-building.   |
| Canary (5% traffic) | Once steady-state holds in staging.            |
| Production (full)   | Mature experiments; team has playbook for abort. |

Most teams should start in staging. Move to production after the
team has confidence and abort procedures.

## Step 7 - Verdict + report

Emit a per-experiment verdict: the steady-state hypothesis, a pre / during / post
metric table, observations, action items, and the next iteration. The full
report template is in
[references/experiment-authoring.md](references/experiment-authoring.md).

## Steady-state hypothesis validation (pre-flight)

An authored experiment is not ready to run until its hypothesis survives five
pre-flight checks. A hypothesis that cannot be measured, has no baseline, or
would not move under the injected fault produces a verdict that means nothing.
Per [chaos-principles][cp] Principle 1: "Focus on the measurable output of a
system, rather than internal attributes of the system. Measurements of that
output over a short period of time constitute a proxy for the system's steady
state." Run these checks while the cost of fixing the hypothesis is still low.

The Chaos Toolkit `steady-state-hypothesis` block (required `title` + `probes`,
each with a `provider` and a `tolerance` gate; a failed pre-method check bails
the experiment) and its eight tolerance forms are in
[references/chaostoolkit-tolerance.md](references/chaostoolkit-tolerance.md),
per [chaostoolkit.org/reference/api/experiment/][ctk] and
[chaostoolkit.org/reference/concepts/][ctk-concepts].

[ctk]: https://chaostoolkit.org/reference/api/experiment/
[ctk-concepts]: https://chaostoolkit.org/reference/concepts/

| # | Check | Passes when | Fails when |
|---|---|---|---|
| 1 | **Measurable and observable** | The team can run the probe in isolation right now and get a numeric or boolean return (Prometheus query, Datadog API, health endpoint, exit code) | The provider is a dashboard URL read by eye, a metric no service emits yet, or needs credentials absent from the run environment |
| 2 | **A recent baseline exists** | A dashboard, runbook, or monitoring record shows the metric's typical value over the past 7-30 days of normal traffic | The threshold is a round-number guess, the baseline predates the last deployment or is older than 30 days, or was taken during an incident |
| 3 | **Tolerance is SLI-backed** | The threshold maps to a published SLO, error-budget line, or documented user-impact threshold (e.g. the on-call alert value) | The tolerance accepts total degradation (`>= 0%`), sits inside the metric's noise band, or no SLO/SLI document backs it |
| 4 | **Measurement window defined** | The probe aggregates over an explicit window of at least 1 minute (`avg_over_time(...[5m])`, a rollup with a stated range) | A single-sample point-in-time value (one HTTP 200) stands in for sustained health, or `measured_over` is 0 / missing |
| 5 | **Metric moves under the fault** | The fault's propagation path from injection point to the metric's data source is traceable, with at least one step directly affecting the metric | Fault and probe share no call-graph path, a global aggregate averages a regional fault away, or a fallback masks the fault entirely |

Check 5 is the most important: a probe decoupled from the fault produces a
vacuous "held" result. Ask: if this experiment "held", would that mean the
system is resilient, or just that the metric is unrelated?

### Hard-reject conditions

These block execution outright; do not run the experiment until resolved.

| Hard reject | Maps to | Why it is fatal |
|---|---|---|
| Probe returns a constant (an LB liveness check or single HTTP 200 that passes even with all backends down) | Checks 1, 4, 5 | The probe cannot register degradation; a "held" verdict is vacuous |
| Boolean `tolerance: true` whose only `false` path is total unavailability | Check 3 | Tests catastrophe, not resilience |
| No baseline measurement cited in the experiment or runbook | Check 2 | The tolerance was chosen without measurement |
| Metric is an internal attribute (thread-pool queue depth, JVM heap) that is not also a published SLI | Checks 1, 3 | Per [chaos-principles][cp] Principle 1, internal state is not a valid steady-state output |
| Fault and probe share no call-graph path, or a global aggregate masks a regional fault | Check 5 | A "held" result means the metric is unrelated, not that the system is resilient |

### Pre-flight verdict format

Emit one row per probe, then a summary:

```
Probe: <probe name>
  Check 1 (measurable):  PASS / FAIL - <reason>
  Check 2 (baseline):    PASS / FAIL - <reason>
  Check 3 (SLI-backed):  PASS / FAIL - <reason>
  Check 4 (window):      PASS / FAIL - <reason>
  Check 5 (moves):       PASS / FAIL - <reason>

Verdict: SOUND / UNSOUND
  Hard-reject triggered: yes / no
  Recommended action: <proceed | revise probe | replace metric | add baseline>
```

The validation reads the hypothesis specification, not the live system:
instrumentation gaps (Check 1) and stale baselines (Check 2) are confirmed by
running the probe manually, and Check 5 is a reasoning exercise over the
dependency graph, not an automated trace.

## Anti-patterns

The seven authoring anti-patterns, each with why it fails and the fixing step,
are in
[references/experiment-authoring.md](references/experiment-authoring.md):
hypothesis-as-feeling, inject-anything, production-first, no abort conditions,
manual-only runs, one-off-then-forget, and skipping the verdict report.

## Limitations

- **Real-world hypothesis quality varies.** Teams may discover
  their "steady-state metric" wasn't actually measurable; iterate.
- **Production experiments need org buy-in.** Compliance, SLO
  budget, on-call awareness all matter.
- **Experimentation cost.** Each experiment uses SLO budget;
  schedule with budget in mind.
- **Per-tool integration.** Different tools have different syntax;
  this skill is tool-agnostic at the methodology layer.

## References

- [cp][cp] - Principles of Chaos Engineering: 5 advanced
  principles (steady-state, real-world events, production,
  automation, blast radius).
- [ctk][ctk], [ctk-concepts][ctk-concepts] - Chaos Toolkit
  `steady-state-hypothesis` block spec, tolerance types, pre-/post-method
  evaluation and bail-out semantics.
- [references/litmus.md](references/litmus.md),
  [references/gremlin.md](references/gremlin.md) - LitmusChaos and Gremlin
  runner deep dives ([references/gremlin-advanced-operations.md](references/gremlin-advanced-operations.md)
  for Gremlin Scenarios / Reliability Score / CI).
- `chaos-mesh`,
  `toxiproxy-chaos` - standalone per-tool
  runners.
- `failure-injection-test-author` - sibling: combines chaos with test suites.
- `chaos-drill-protocol` - the run protocol once the experiment is designed and validated.
- `prod-canary-validator` (in the qa-shift-right plugin) - provides the steady-state metrics that verdict the experiment and can anchor hypothesis baselines (Check 2).
