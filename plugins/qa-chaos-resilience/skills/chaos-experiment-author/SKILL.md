---
name: chaos-experiment-author
description: "Build-an-X workflow for a chaos experiment per the Principles of Chaos Engineering - defines steady-state hypothesis, picks the variables (real-world events: network latency, node failure, region outage), sets the blast radius (which percentage / namespace / user cohort), automates execution, and emits the verdict (steady-state held / didn''''t hold). Use to scope a chaos experiment before running it via Litmus / Chaos Mesh / Gremlin / Toxiproxy."
rating: 23
d6: 4
archetype: S3
---

# chaos-experiment-author

## Overview

Per [chaos-principles][cp]:

[cp]: https://principlesofchaos.org/

> "**Chaos Engineering** is the discipline of experimenting on a
> system in order to build confidence in the system's capability
> to withstand turbulent conditions in production."

The 5 advanced principles ([chaos-principles][cp]):

> 1. **Build a Hypothesis around Steady State Behavior** - "Focus on the measurable output of a system, rather than internal attributes of the system."
> 2. **Vary Real-world Events** - "Chaos variables reflect real-world events. Prioritize events either by potential impact or estimated frequency."
> 3. **Run Experiments in Production** - "To guarantee both authenticity of the way in which the system is exercised and relevance to the current deployed system, Chaos strongly prefers to experiment directly on production traffic."
> 4. **Automate Experiments to Run Continuously** - "Running experiments manually is labor-intensive and ultimately unsustainable. Automate experiments and run them continuously."
> 5. **Minimize Blast Radius** - "It is the responsibility and obligation of the Chaos Engineer to ensure the fallout from experiments are minimized and contained."

This skill walks the team through authoring an experiment that
honors all five.

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
Don't inject "anything"; inject what could plausibly happen.

| Event class      | Examples                                                    |
|------------------|-------------------------------------------------------------|
| Network          | Latency 500ms, packet loss 5%, DNS failure, connection reset |
| Compute          | Pod kill, CPU throttle, OOM kill, node drain                 |
| Storage          | Disk full, slow disk, read failure                          |
| Time             | Clock skew, leap second                                      |
| Region / zone    | Single AZ outage, multi-AZ outage                            |
| Dependency       | Third-party API 500s, rate limit, timeout                    |
| Configuration    | Bad config push, secret rotation failure                     |

Pick events the team has already seen (real incidents) or
realistically expects.

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

**Default: [`chaos-mesh`](../chaos-mesh/SKILL.md) for Kubernetes stacks** - CNCF-graduated, broadest fault catalog (network / pod / IO / time / stress), declarative CRDs that compose with the experiment YAML in Step 1. Use [`litmus-chaos`](../litmus-chaos/SKILL.md) when the team already runs Litmus workflows; [`gremlin-chaos`](../gremlin-chaos/SKILL.md) for commercial multi-platform support outside Kubernetes; [`toxiproxy-chaos`](../toxiproxy-chaos/SKILL.md) when the failure surface is purely TCP-level.

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

```markdown
## Chaos experiment verdict — `checkout-network-latency`

**Date:** YYYY-MM-DD   **Duration:** 5 minutes
**Steady-state hypothesis:** checkout_completion_rate >= 95%
**Verdict:** ✅ HELD

| Metric                   | Pre-experiment | During experiment | Post |
|--------------------------|----------------|-------------------|------|
| checkout_completion_rate |     97.2%      |       96.8%       | 97.5% |
| p95 latency              |     245ms      |       380ms       | 240ms |

### Observations
- Latency increased as expected (300ms injected).
- Retry logic worked: ~200 retries observed; no user-visible failures.

### Action items
- (none — system behaved as expected)

### Next iteration
- Increase blast radius from 1% to 5% in next month's run.
- Add a longer-duration variant (15 min) to test fatigue.
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hypothesis as feeling ("system feels stable")                         | Unmeasurable; can't tell if held.                                        | Numeric metric (Step 1). |
| Inject anything; see what breaks                                       | Wastes effort; misses real failure modes.                                | Pick real-world events (Step 2). |
| Production-first experiment without staging                            | Risks user-visible incident on first run.                                | Staging → canary → production (Step 6). |
| No abort conditions                                                    | Experiment runs past safety threshold; real incident.                   | Define abort + manual abort signal (Step 3). |
| Manual experiment runs only                                            | Per [chaos-principles][cp]: "labor-intensive and ultimately unsustainable." | Automate (Step 5). |
| One-off experiment then forget                                         | Confidence decays; same incident recurs.                                 | Schedule + repeat (Step 5 cron). |
| Skipping the verdict report                                            | Lessons not captured; next iteration arbitrary.                          | Step 7 report. |

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
- [`litmus-chaos`](../litmus-chaos/SKILL.md),
  [`chaos-mesh`](../chaos-mesh/SKILL.md),
  [`gremlin-chaos`](../gremlin-chaos/SKILL.md),
  [`toxiproxy-chaos`](../toxiproxy-chaos/SKILL.md) - per-tool
  runners.
- [`failure-injection-test-author`](../failure-injection-test-author/SKILL.md) - sibling: combines chaos with test suites.
- [`prod-canary-validator`](../../qa-shift-right/skills/prod-canary-validator/SKILL.md) - provides the steady-state metrics that verdict the experiment.
