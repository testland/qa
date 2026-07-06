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
[`litmus-chaos`](../litmus-chaos/SKILL.md) or
[`chaos-mesh`](../chaos-mesh/SKILL.md).

## Step 1 - Install Gremlin agent

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

## Step 2 - Attack types

Per [gremlin-home][gh] and the broader Gremlin docs:

| Class       | Attack             | Effect                                   |
|-------------|--------------------|------------------------------------------|
| Resource     | CPU                | Spike CPU usage                          |
| Resource     | Memory             | Spike memory                              |
| Resource     | Disk I/O           | Spike disk I/O                            |
| Resource     | Disk space         | Fill disk                                  |
| Network      | Latency             | Inject latency                             |
| Network      | Packet loss         | Drop packets                                |
| Network      | DNS                 | DNS resolution failure                      |
| Network      | Blackhole          | Drop all packets to/from a target           |
| State        | Shutdown            | Reboot the host                             |
| State        | Process killer      | Kill a specific process                     |
| State        | Time travel         | Skew the system clock                       |
| Request     | Request injection    | Modify HTTP requests in flight             |

## Step 3 - Run an attack via UI

Web UI workflow:

1. Select target (host / container / service / Lambda).
2. Pick attack type.
3. Configure (e.g., latency 500ms; duration 5min).
4. Optionally schedule.
5. Click "Unleash."

The UI provides safety: blast-radius scoping, abort button,
notifications.

## Step 4 - Author a Scenario

A Scenario chains multiple attacks:

```yaml
# Pseudo-Scenario config (Gremlin's UI exports JSON; this approximates)
scenario:
  name: "Checkout resilience test"
  attacks:
    - type: latency
      target: { service: checkout }
      length: 5min
      latency: 500ms
    - type: packet-loss
      target: { service: payment }
      length: 5min
      loss-percent: 10
      delay-after-previous: 1min
  abort_conditions:
    - "Sentry error rate > 2%"
    - "Manual abort"
```

Scenarios match per the [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md)
"vary real-world events" principle - combinations approximate real
incidents.

## Step 5 - Reliability score

Per [gremlin-home][gh], Gremlin's differentiator is the
"Reliability Score" - "individual services" get scores "based on
dependency mapping, risk detection, and failure testing."

Score components (per Gremlin docs):

- **Resilience tests** passed: % of attacks the service survived
- **Dependency map**: service-to-service relationships
- **Detected risks**: configuration drift, hidden dependencies

A service moving from "untested" to "score 80" via passing
attacks creates an objective improvement signal.

## Step 6 - API + automation

```bash
curl -X POST "https://api.gremlin.com/v1/attacks/new" \
  -H "Authorization: Key $GREMLIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "command": {
      "type": "latency",
      "args": ["-l", "300", "-m", "500", "-c", "5", "-h", "^api\\.example\\.com$"]
    },
    "target": {
      "type": "Random",
      "containers": { "labels": { "app": "checkout" } }
    }
  }'
```

API enables CI integration:

```yaml
- name: Trigger Gremlin scenario
  run: |
    curl -X POST "https://api.gremlin.com/v1/scenarios/${{ vars.SCENARIO_ID }}/runs" \
      -H "Authorization: Key ${{ secrets.GREMLIN_API_KEY }}"
- name: Wait + verdict
  run: sleep 600 && ./scripts/datadog-verdict.sh
```

## Step 7 - Compliance + audit

Gremlin's enterprise tier (per [gremlin-home][gh]'s positioning)
provides:

- Audit logs (who triggered what, when).
- RBAC at organization / team / role level.
- SOC 2 / FedRAMP / etc. compliance posture.

Important for regulated industries where audit is non-negotiable.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Manual UI-only attacks                                                 | Doesn't scale; per chaos principle 4 must automate.                      | API-driven scenarios (Step 6). |
| Skipping abort conditions                                              | Attack runs past safety threshold.                                       | Define abort signals (Step 4). |
| Treating Reliability Score as the only signal                          | Score is service-level; per-attack verdicts matter too.                  | Both Score (trend) + per-attack verdicts (detail). |
| One-shot installation; team forgets                                    | License paid; not used.                                                  | Schedule attacks; build into release process. |
| Production attacks without playbook                                    | Real incident if attack escalates.                                       | Per [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md): blast radius + abort. |

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
- [`litmus-chaos`](../litmus-chaos/SKILL.md),
  [`chaos-mesh`](../chaos-mesh/SKILL.md) - open-source K8s-only
  alternatives.
- [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md) - methodology Gremlin Scenarios implement.
