---
name: chaos-experiment-author
description: "Build-an-X workflow for a chaos experiment per the Principles of Chaos Engineering - defines steady-state hypothesis, picks the variables (real-world events: network latency, node failure, region outage), sets the blast radius (which percentage / namespace / user cohort), automates execution, and emits the verdict (steady-state held / didn't hold). Use to scope a chaos experiment before running it via Litmus / Chaos Mesh / Gremlin / Toxiproxy."
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

**Default: `chaos-mesh` for Kubernetes stacks** - CNCF-graduated, broadest fault catalog (network / pod / IO / time / stress), declarative CRDs that compose with the experiment YAML in Step 1. Use `litmus-chaos` when the team already runs Litmus workflows; `gremlin-chaos` for commercial multi-platform support outside Kubernetes; `toxiproxy-chaos` when the failure surface is purely TCP-level.

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
- `litmus-chaos`,
  `chaos-mesh`,
  `gremlin-chaos`,
  `toxiproxy-chaos` - per-tool
  runners.
- `failure-injection-test-author` - sibling: combines chaos with test suites.
- `prod-canary-validator` (in the qa-shift-right plugin) - provides the steady-state metrics that verdict the experiment.
