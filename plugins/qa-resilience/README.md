# qa-resilience

Chaos engineering, fault injection, and resilience drills. The unrehearsed half: structured chaos-experiment authoring with steady-state pre-flight validation and per-tool routing (Chaos Mesh standalone; LitmusChaos and Gremlin as references), the chaos-drill run protocol with abort gates and recovery validation, Toxiproxy (TCP-level), and combined HTTP+TCP fault injection. The rehearsed half: measured, scheduled DR drills with backup verification and restore-time SLAs worked in references, plus error budgets and MTTR/MTBF tracking.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [chaos-experiment-author](skills/chaos-experiment-author/SKILL.md) | Build-an-X workflow for a chaos experiment per the Principles of Chaos Engineering - steady-state hypothesis, real-world event choice, blast radius, automation, verdict. Includes the five-check pre-flight hypothesis validation with hard-reject rules, and routes tool choice: LitmusChaos + Gremlin setup live in references/, chaos-mesh stays standalone. |
| Skill | [chaos-mesh](skills/chaos-mesh/SKILL.md) | Configures Chaos Mesh for Kubernetes-native chaos engineering - picks fault types (PodChaos, NetworkChaos, StressChaos, IOChaos, TimeChaos, DNSChaos, KernelChaos, HTTPChaos), targets via label selectors, controls blast radius via namespace whitelists + selector filters, schedules via CronJobs, observes via dashboard. |
| Skill | [toxiproxy-chaos](skills/toxiproxy-chaos/SKILL.md) | Configures Toxiproxy for TCP-level fault injection - runs as a sidecar / proxy between client and upstream, applies toxics (latency, bandwidth, slow_close, timeout, slicer, limit_data, reset_peer) via control API. Use for TCP-precise fault injection in development / integration environments without K8s or commercial tooling. |
| Skill | [failure-injection-test-author](skills/failure-injection-test-author/SKILL.md) | Build-an-X workflow that combines WireMock fault stubs (HTTP-level fault: 500s, malformed JSON, slow responses) with Toxiproxy (TCP-level: latency, packet loss, reset) into one orchestrated test scenario - the test starts both, applies fault per scenario, runs the SUT against the impaired endpoints, verifies the SUT's resilience patterns. |
| Skill | [chaos-drill-protocol](skills/chaos-drill-protocol/SKILL.md) | The run protocol and run workflow for an already-designed experiment: four pre-flight gates, a derived blast-radius bound, abort criteria fixed before injection, per-runner inject/abort commands with refuse-to-start rules, and recovery validation with tolerance and timeout. |
| Skill | [dr-drill-runner](skills/dr-drill-runner/SKILL.md) | The full DR-drill discipline: per-tier RTO + RPO; pre-drill checklist; drill workflow (announce → fail-over → verify → fail-back → cleanup); the supervised run protocol (refuse rules, RTO/RPO monitor, abort-on-breach); post-drill report; cold/warm/hot patterns; cadence. Backup-integrity verification and restore-time / RTO measurement live in references/. |
| Skill | [error-budget-tests](skills/error-budget-tests/SKILL.md) | SLI calculation; budget consumption; multi-window multi-burn-rate alerting; freeze-trigger when budget exhausted; rolling-window reset; weekly stakeholder reporting. The MTTR / MTTA / MTTD / MTBF incident-metrics schema + formulae live in references/. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-resilience@testland-qa
```
