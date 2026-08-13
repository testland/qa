# qa-chaos

Chaos engineering + fault injection per the Principles of Chaos Engineering. Litmus / Chaos Mesh (Kubernetes-native), Gremlin (commercial multi-platform), Toxiproxy (TCP-level), structured chaos experiment authoring, and combined HTTP+TCP fault injection scenarios.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [chaos-experiment-author](skills/chaos-experiment-author/SKILL.md) | Build-an-X workflow for a chaos experiment per the Principles of Chaos Engineering - defines steady-state hypothesis, picks the variables (real-world events: network latency, node failure, region outage), sets the blast radius (which percentage / namespace / user cohort), automates execution, and emits the verdict (steady-state held / didn't hold). Use to scope a chaos experiment before running it via Litmus / Chaos Mesh / Gremlin / Toxiproxy. |
| Skill | [litmus-chaos](skills/litmus-chaos/SKILL.md) | Configures LitmusChaos for Kubernetes-native chaos engineering - installs via Helm, picks ChaosExperiments from the ChaosHub (`pod-delete`, `network-latency`, `node-cpu-hog`, etc.), authors a ChaosEngine CR scoping the experiment + steady-state probes, runs as part of the cluster, exports Prometheus metrics for the verdict. Use when the platform is Kubernetes (CNCF-hosted; cloud-native). |
| Skill | [chaos-mesh](skills/chaos-mesh/SKILL.md) | Configures Chaos Mesh for Kubernetes-native chaos engineering - picks fault types (PodChaos, NetworkChaos, StressChaos, IOChaos, TimeChaos, DNSChaos, KernelChaos, HTTPChaos), targets via label selectors, controls blast radius via namespace whitelists + selector filters, schedules via CronJobs, observes via dashboard. Distinct from Litmus by architecture (Chaos Mesh has its own dashboard + workflow orchestration; Litmus uses ChaosCenter UI). |
| Skill | [gremlin-chaos](skills/gremlin-chaos/SKILL.md) | Configures Gremlin (commercial) for cross-platform chaos engineering - installs the Gremlin agent on Linux / Windows / Kubernetes, picks attack types (resource, network, state, request), creates Scenarios chaining attacks, integrates with the Reliability Score for forward-looking metrics. Use when the platform spans multiple environments (bare metal + cloud + serverless) and the team needs a commercial-supported solution per Gremlin's multi-platform support. |
| Skill | [toxiproxy-chaos](skills/toxiproxy-chaos/SKILL.md) | Configures Toxiproxy for TCP-level fault injection - runs as a sidecar / proxy between client and upstream, applies toxics (latency, bandwidth, slow_close, timeout, slicer, limit_data, reset_peer) via control API. Sister to api-chaos-runner (qa-api-testing) but focused on the proxy itself + non-test usage (chaos in dev environments, integration tests, pre-prod simulation). Use when the team needs TCP-precise fault injection in development / integration environments without K8s or commercial tooling. |
| Skill | [failure-injection-test-author](skills/failure-injection-test-author/SKILL.md) | Build-an-X workflow that combines WireMock fault stubs (HTTP-level fault: 500s, malformed JSON, slow responses) with Toxiproxy (TCP-level: latency, packet loss, reset) into one orchestrated test scenario - the test starts both, applies fault per scenario, runs the SUT against the impaired endpoints, verifies the SUT's resilience patterns. Use when neither pure HTTP fault stubs nor pure TCP chaos covers the actual production failure modes - most real failures span both layers. |
| Agent | [chaos-drill-orchestrator](agents/chaos-drill-orchestrator.md) | Action-taking orchestrator that runs a full chaos drill end-to-end - pre-flight checks → experiment injection (via chaos-experiment-author + chosen runner: Chaos Mesh / Litmus / Gremlin / Toxiproxy) → blast-radius monitoring → automatic abort if blast radius exceeds bounds → recovery validation. Distinct from `qa-chaos/chaos-experiment-author` (S1 - authors ONE experiment file). This agent orchestrates the four-stage drill workflow, not a single experiment. Use when running a planned chaos drill against a non-prod environment and the team wants the full pre-flight → inject → monitor → recover loop executed as one workflow. |
| Skill | [steady-state-hypothesis-validator](skills/steady-state-hypothesis-validator/SKILL.md) | Pre-flight validate a chaos experiment's steady-state hypothesis (measurable, baselined, meaningful). |
| Skill | [chaos-drill-protocol](skills/chaos-drill-protocol/SKILL.md) | The run protocol for an already-designed experiment: four pre-flight gates, a derived blast-radius bound, abort criteria fixed before injection, and recovery validation with tolerance and timeout. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-chaos@testland-qa
```
