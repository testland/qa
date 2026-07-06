---
name: steady-state-hypothesis-validator
description: "Validates a chaos experiment's steady-state hypothesis before execution: checks that each probe metric is measurable and observable, that a recent baseline exists, that tolerances are numerically meaningful and SLI-backed, that the measurement window is defined, and that the chosen metrics would actually move under the target failure mode. Use when a chaos experiment has been authored (via chaos-experiment-author) and the team needs a pre-flight verdict before running the drill in any environment."
---

# steady-state-hypothesis-validator

## Overview

A chaos experiment's steady-state hypothesis is the contract that determines
whether an experiment is scientifically useful or a no-op. Per
[principlesofchaos.org][cp] Principle 1:

> "Focus on the measurable output of a system, rather than internal
> attributes of the system. Measurements of that output over a short
> period of time constitute a proxy for the system's steady state."

A hypothesis that cannot be measured, has no baseline, or would not move
under the injected fault produces a verdict that means nothing. This skill
runs five pre-flight checks against the hypothesis block before any tooling
executes, catching bad hypotheses while the cost of fixing them is low.

[cp]: https://principlesofchaos.org/

## The Chaos Toolkit steady-state-hypothesis block

Per [chaostoolkit.org/reference/api/experiment/][ctk], the
`steady-state-hypothesis` object requires:

- `title` (string): human-readable rationale for the hypothesis.
- `probes` (array): one or more probe objects, each with:
  - `type`: `"probe"`
  - `name`: identifier string
  - `provider`: execution specification (HTTP, process, or Python)
  - `tolerance`: the gate value; if the probe's return value does not satisfy
    the tolerance, the experiment bails before running the method.

Tolerance forms supported ([chaostoolkit.org/reference/api/experiment/][ctk]):

| Tolerance form | Syntax example | Evaluation |
|---|---|---|
| Scalar equality | `"tolerance": 200` | probe return == 200 |
| Boolean equality | `"tolerance": true` | probe return == true |
| String equality | `"tolerance": "OK"` | probe return == "OK" |
| Inclusive range | `"tolerance": [95, 100]` | 95 <= value <= 100 |
| Membership | `"tolerance": [200, 201, 204]` | value in list |
| Regex | `"tolerance": {"type": "regex", "pattern": "^healthy$"}` | regex match |
| JSONPath | `"tolerance": {"type": "jsonpath", "path": "$.status", "expect": "up"}` | JSONPath extract + compare |
| Range object | `"tolerance": {"type": "range", "range": [95.0, 100.0]}` | numeric bounds |

**Execution flow** ([chaostoolkit.org/reference/concepts/][ctk-concepts]):
probes run once before the method (baseline check) and once after (deviation
check). A probe that fails before the method means the system is already
outside its acceptable state; the experiment must not run. A probe that fails
after the method means the chaos activity caused the system to leave its
steady state.

[ctk]: https://chaostoolkit.org/reference/api/experiment/
[ctk-concepts]: https://chaostoolkit.org/reference/concepts/

## The five pre-flight checks

### Check 1 - Metric is measurable and observable

The probe must query a real data source the team can access right now: a
Prometheus query endpoint, a Datadog API, an HTTP health endpoint, a process
exit code. The metric must already be instrumented.

**Fail signals:**
- The probe `provider` points to a dashboard URL rather than an API endpoint.
- The metric name is a made-up label not yet emitted by any service.
- The only way to evaluate the metric is to read it manually.
- The probe requires credentials or tooling not available in the environment
  where the experiment will run.

**Pass signal:** The team can run the probe in isolation right now and get a
numeric or boolean return value.

### Check 2 - A recent baseline exists

Per [principlesofchaos.org][cp]: "Measurements of that output over a short
period of time constitute a proxy for the system's steady state." The
tolerance must be anchored to observed behavior, not a guess.

**Fail signals:**
- The threshold is a round number with no supporting measurement (e.g.,
  `>= 99%` when the service has never been measured).
- The most recent baseline measurement is older than 30 days, or predates
  the last deployment.
- The baseline was taken during a known incident or load spike.

**Pass signal:** The team can cite a dashboard, runbook, or monitoring
record showing the metric's typical value over the past 7-30 days in normal
production or staging traffic.

### Check 3 - Tolerance is numerically meaningful and SLI-backed

The tolerance bounds must reflect a real service-level indicator (SLI),
not an arbitrary threshold that would never be breached even during a real
incident.

**Fail signals:**
- Tolerance is so wide it would accept total service degradation
  (e.g., `>= 0%` completion rate).
- Tolerance is tighter than the metric's normal noise band, so it fails
  spuriously in baseline conditions.
- The tolerance value is the same as "system is completely down" rather
  than "system is noticeably degraded."
- No SLO or SLI document backs the threshold choice.

**Pass signal:** The threshold maps to a published SLO, an error budget line,
or a documented user-impact threshold (e.g., checkout completion >= 95%
because below that the on-call alert fires).

**Diagnostic questions:**
- What SLO or alert threshold does this tolerance align with?
- At what value would a real on-call alert fire?
- Has this metric ever breached this threshold under normal operations?

### Check 4 - Measurement window is defined

A probe without a defined measurement window can return a point-in-time
value that is unrepresentative of system behavior. The `measured_over` or
equivalent window annotation in the experiment YAML must be present.

**Fail signals:**
- The probe queries a single-sample endpoint with no aggregation window.
- The experiment YAML specifies `measured_over: 0` or omits it entirely.
- A single HTTP status check is used as a proxy for sustained service health.

**Pass signal:** The probe measures an aggregated value over a window of at
least 1 minute (longer for low-traffic services). For Prometheus: a
`rate()` or `avg_over_time()` expression with an explicit range vector.
For Datadog: a rollup with a defined time window.

```yaml
# Acceptable: aggregated over a window
probes:
  - name: checkout-completion-rate
    type: probe
    provider:
      type: http
      url: "https://metrics.internal/query?expr=avg_over_time(checkout_success_rate[5m])"
    tolerance:
      type: range
      range: [95.0, 100.0]
```

```yaml
# Risky: single-sample point-in-time check
probes:
  - name: homepage-status
    type: probe
    provider:
      type: http
      url: "https://app.example.com/"
    tolerance: 200
```

### Check 5 - The metric moves under the target failure mode

The most important check: would the injected fault actually cause this
metric to change? A probe that is decoupled from the fault being injected
produces a vacuous result.

**Fail signals:**
- The fault is a database connection failure, but the probe measures
  frontend CPU usage.
- The fault affects one region, but the probe aggregates globally across
  all regions.
- The fault is network latency to a third-party API, but the probe
  measures an in-process in-memory cache hit rate that does not depend
  on that API.
- The service has circuit-breaker or cached fallbacks that prevent the
  fault from ever reaching the probe's data path.

**Pass signal:** The team can trace the fault's propagation path from
injection point to the metric's data source and confirm at least one
step in that path directly affects the metric.

**Diagnostic questions:**
- Draw the call graph from injection point to the probe's data source.
  Is there a direct path?
- Does the service have a fallback that would mask the fault from this
  metric entirely?
- If this experiment "held" (metric stayed in tolerance), would that
  mean the system is resilient, or just that the metric is unrelated?

## Worked example

**Experiment:** inject 500ms network latency on the payment-service pod;
hypothesis is that checkout completion rate stays >= 95%.

```yaml
steady-state-hypothesis:
  title: "Checkout completion rate stays above 95% under payment-service latency"
  probes:
    - name: checkout-completion-rate
      type: probe
      provider:
        type: http
        url: "https://metrics.internal/query?expr=avg_over_time(checkout_success_rate[5m])"
        timeout: 10
      tolerance:
        type: range
        range: [95.0, 100.0]
```

Pre-flight verdict against each check:

| Check | Result | Evidence |
|---|---|---|
| 1. Measurable | Pass | HTTP probe queries Prometheus; team ran it manually and got 97.2 |
| 2. Baseline exists | Pass | Datadog dashboard shows 7-day avg of 97.1%; last deploy 3 days ago |
| 3. SLI-backed tolerance | Pass | SLO doc sets user-impact floor at 95%; on-call alert fires at 94% |
| 4. Window defined | Pass | `avg_over_time([5m])` range vector; 5m is above the 1m floor |
| 5. Metric moves | Pass | Payment-service is on the critical checkout path; latency raises p95 and increases timeouts that cause checkout failures |

Verdict: hypothesis is sound. Proceed to experiment execution.

## Hard-reject conditions

The following hypothesis patterns are hard rejects. Do not proceed to
execution until they are resolved:

1. **Probe returns a constant** - a health endpoint that always returns 200
   regardless of backend state (e.g., a load-balancer liveness check that
   passes even when all backends are down).
2. **Tolerance is `true` on a boolean probe with no degradation path** -
   if the only way the probe returns `false` is total service unavailability,
   the experiment does not test resilience, it tests catastrophe.
3. **No baseline measurement cited in the experiment or runbook** - the
   tolerance was chosen without measurement.
4. **Metric is an internal attribute, not a measurable output** - per
   [principlesofchaos.org][cp] Principle 1, internal state (e.g., thread
   pool queue depth, JVM heap used) is not a valid steady-state metric unless
   it is also a published SLI.
5. **The fault and the probe have no shared call-graph path** - confirmed
   by tracing (Check 5 fail with no plausible connection).

## Output format

Emit one row per probe in the hypothesis block, then a summary verdict:

```
Steady-State Hypothesis Pre-Flight Report
==========================================
Experiment: <title>
Fault: <fault description>

Probe: <probe name>
  Check 1 (measurable):  PASS / FAIL - <reason>
  Check 2 (baseline):    PASS / FAIL - <reason>
  Check 3 (SLI-backed):  PASS / FAIL - <reason>
  Check 4 (window):      PASS / FAIL - <reason>
  Check 5 (moves):       PASS / FAIL - <reason>

Verdict: SOUND / UNSOUND
  Blocking issues: <list or "none">
  Hard-reject triggered: yes / no
  Recommended action: <proceed | revise probe | replace metric | add baseline>
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "The service stays up" | Unmeasurable; per [principlesofchaos.org][cp] Principle 1, focus on output not state | Replace with a throughput or error-rate metric |
| HTTP 200 check as steady-state | A single status code check may not reflect user-visible success rate | Use completion rate or error budget metric |
| Tolerance = 0% error rate | Too tight; normal traffic noise causes spurious failures | Align to SLO floor (e.g., error rate < 0.5%) |
| Global metric for a regional fault | Aggregation masks the failure; [principlesofchaos.org][cp] notes "systemic behavior patterns" | Scope the query to the affected region or cohort |
| Metric unrelated to fault path | Produces vacuous "held" result | Trace the fault's call graph; pick a metric in that path |
| Omitting `measured_over` | Point-in-time samples are noisy; window matters | Use a range vector query (Prometheus) or rollup window (Datadog) |

## Limitations

- This skill validates the hypothesis specification, not the live system.
  Instrumentation gaps (Check 1) or stale baselines (Check 2) can only be
  confirmed by running the probe manually before authoring the experiment.
- SLI-backing (Check 3) requires access to the team's SLO documents or
  alert configuration. If neither exists, the team should define a threshold
  and document the rationale in the experiment YAML before running.
- Check 5 (metric moves) is a reasoning exercise, not an automated trace.
  For complex microservice graphs, draw the dependency diagram manually.
- The Chaos Toolkit tolerance schema does not enforce window-based
  aggregation; a point-in-time HTTP probe is syntactically valid even if
  it is a poor steady-state indicator. This skill flags it as a warning,
  not a hard error (unless the probe returns a constant).

## References

- [principlesofchaos.org][cp] - Principle 1: "Build a Hypothesis around
  Steady State Behavior." Defines measurable output, throughput, error
  rates, latency percentiles as valid steady-state metrics.
- [chaostoolkit.org/reference/api/experiment/][ctk] - `steady-state-hypothesis`
  block specification: required fields (`title`, `probes`), tolerance types
  (scalar, range, regex, jsonpath, probe), and evaluation semantics.
- [chaostoolkit.org/reference/concepts/][ctk-concepts] - Experiment lifecycle:
  pre-method vs. post-method hypothesis check, bail-out behavior when
  pre-check fails, deviation detection after method.
- [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md) - upstream
  skill that authors the experiment (Step 1 defines the hypothesis this skill
  validates).
- [`prod-canary-validator`](../../../qa-shift-right/skills/prod-canary-validator/SKILL.md) -
  provides the production steady-state metrics that can anchor hypothesis
  baselines (Check 2).
