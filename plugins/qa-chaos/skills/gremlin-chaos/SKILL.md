---
name: gremlin-chaos
description: "Configures Gremlin (commercial) for cross-platform chaos engineering - installs the Gremlin agent on Linux / Windows / Kubernetes, picks attack types (resource, network, state, request), creates Scenarios chaining attacks, integrates with the Reliability Score for forward-looking metrics. Use when the platform spans multiple environments (bare metal + cloud + serverless) and the team needs a commercial-supported solution per Gremlin's multi-platform support."
---

# gremlin-chaos

## Overview

Per [gremlin-home][gh]:

[gh]: https://www.gremlin.com/

> "**Gremlin** is an Enterprise Reliability Management & Resilience
> Testing platform that helps organizations move from reactive
> incident metrics to proactive reliability measurement."

Per [gremlin-home][gh], the platform provides "forward-looking
reliability scores - so your teams can see where systems will fail,
fix them first, and prove the results."

Multi-platform: per [gremlin-home][gh], Gremlin works across "bare
metal, on-prem, multi-cloud, and serverless."

## When to use

- The platform spans multiple environments (not just Kubernetes - 
  Gremlin's differentiator vs LitmusChaos / Chaos Mesh).
- Enterprise support is required (compliance, audit, SLA).
- The team wants reliability scoring (vs just per-experiment
  pass/fail).
- The team is in regulated industry (finance, healthcare) needing
  the compliance posture.

If the team is K8s-only and OSS-preferred, see
`litmus-chaos` or
`chaos-mesh`.

## How to use

1. Install the Gremlin agent on the target host or cluster (see Install) and register it with the Gremlin Control Plane.
2. Pick an attack type from the four classes (resource, network, state, request) - the exhaustive per-attack table is in [references/advanced-operations.md](references/advanced-operations.md).
3. Run one scoped experiment end to end against staging - define steady state, inject a single fault with a tight blast radius, observe, and abort on breach (see Worked example).
4. Promote passing experiments into a Scenario (chained attacks + abort conditions), wire it into CI via the API, and track each service's Reliability Score - all covered in [references/advanced-operations.md](references/advanced-operations.md).

## Install

Linux:

```bash
sudo apt install -y gremlin
sudo gremlin auth login --org-id <org-id> --user-id <user-id> --api-token <token>
```

Kubernetes:

```bash
helm repo add gremlin https://helm.gremlin.com
helm install gremlin gremlin/gremlin \
  --namespace gremlin --create-namespace \
  --set gremlin.secret.create=true \
  --set gremlin.secret.teamID=<team-id> \
  --set gremlin.secret.clusterID=<cluster-id> \
  --set gremlin.secret.teamSecret=<secret>
```

The agent connects to the Gremlin Control Plane (cloud); attacks
trigger via web UI or API.

## Attack types

Gremlin groups fault injections into four classes (per
[gremlin-home][gh] and the Gremlin docs):

| Class    | Representative attacks             | Effect                          |
|----------|------------------------------------|---------------------------------|
| Resource | CPU, Memory, Disk I/O, Disk space  | Starve or saturate a host resource |
| Network  | Latency, Packet loss, DNS, Blackhole | Degrade or sever connectivity  |
| State    | Shutdown, Process killer, Time travel | Disrupt host / process state  |
| Request  | Request injection                  | Modify HTTP requests in flight  |

The full per-attack table (all twelve attacks with their exact effect)
lives in [references/advanced-operations.md](references/advanced-operations.md).

## Worked example

A single end-to-end experiment: inject 500ms latency into the
`checkout` service, scoped to one container for five minutes.

1. **Steady state.** Confirm from monitoring that checkout error rate
   is under 1% and p95 latency is healthy.
2. **Hypothesis.** A 500ms upstream latency injection keeps the
   error rate under 2% (retries + timeouts absorb it).
3. **Inject the fault** via the API, scoped tight (one container, capped
   at 5 minutes):

```bash
curl -X POST "https://api.gremlin.com/v1/attacks/new" \
  -H "Authorization: Key $GREMLIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "command": {
      "type": "latency",
      "args": ["-l", "300", "-m", "500", "-c", "1", "-h", "^checkout\\..*$"]
    },
    "target": {
      "type": "Random",
      "percent": 10,
      "containers": { "labels": { "app": "checkout" } }
    }
  }'
```

4. **Observe + abort.** Watch the error rate for the five-minute
   window; the UI halt button (or a monitored abort condition) stops
   the attack the moment error rate crosses 2%.
5. **Verdict.** Error rate held at 1.2% - checkout tolerates 500ms
   upstream latency. Record the pass against the service's Reliability
   Score, then widen the blast radius on the next run.

Scenarios (chaining this latency attack with a downstream packet-loss
attack), the Reliability Score model, the full CI workflow, and the
compliance / audit posture are in
[references/advanced-operations.md](references/advanced-operations.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Manual UI-only attacks                                                 | Doesn't scale; per chaos principle 4 must automate.                      | API-driven Scenarios (references/advanced-operations.md). |
| Skipping abort conditions                                              | Attack runs past safety threshold.                                       | Define abort signals on every Scenario (references/advanced-operations.md). |
| Treating Reliability Score as the only signal                          | Score is service-level; per-attack verdicts matter too.                  | Both Score (trend) + per-attack verdicts (detail). |
| One-shot installation; team forgets                                    | License paid; not used.                                                  | Schedule attacks; build into release process. |
| Production attacks without playbook                                    | Real incident if attack escalates.                                       | Per `chaos-experiment-author`: blast radius + abort. |

## Limitations

- **Commercial cost.** Subscription model; per-team / per-host
  pricing. Not suitable for OSS budgets.
- **Cloud control plane.** Air-gapped environments need on-prem
  deployment.
- **Vendor lock-in.** Scenarios + Reliability Score data lives in
  Gremlin; migration cost real.
- **Less Kubernetes-deep than Chaos Mesh / Litmus.** Gremlin
  abstracts platform; loses some K8s-specific power.

## References

- [gh][gh] - Gremlin overview: enterprise reliability platform,
  forward-looking reliability scores, multi-platform (bare metal /
  on-prem / multi-cloud / serverless), fault injection +
  reliability scoring + dependency discovery.
- [references/advanced-operations.md](references/advanced-operations.md) -
  exhaustive attack table, UI attack workflow, Scenario authoring,
  Reliability Score model, the API + CI automation workflow, and the
  compliance / audit posture.
- `litmus-chaos`,
  `chaos-mesh` - open-source K8s-only
  alternatives.
- `chaos-experiment-author` - methodology Gremlin Scenarios implement.
