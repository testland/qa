# qa-saga-cqrs

Distributed-transaction patterns: sagas (replace 2PC across
microservices), event sourcing (events as system of record) with CQRS
projection testing and the eventual-consistency convergence window
folded into its references, and the transactional outbox.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [saga-critic](agents/saga-critic.md) | Audits saga orchestrators and event-sourcing write paths for missing compensating transactions, non-idempotent compensations, dual-write without outbox, absent retry policy, and missing optimistic-concurrency guard on event append. Emits BLOCK / PASS verdict. |
| Skill | [saga-transaction-tests](skills/saga-transaction-tests/SKILL.md) | Orchestration vs choreography; per-step compensating-action verification; partial-failure matrix; outbox pattern atomicity; saga timeout |
| Skill | [event-sourcing-tests](skills/event-sourcing-tests/SKILL.md) | Aggregate-replay determinism; snapshot equivalence; event-versioning + upcasting; CQRS projection rebuild + zero-downtime swap + idempotent/out-of-order apply; convergence-window assertions in references/ |
| Skill | [outbox-pattern-test-author](skills/outbox-pattern-test-author/SKILL.md) | Tests the transactional outbox: atomic write+event, relay at-least-once + dedup + ordering + retry. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-saga-cqrs@testland-qa
```
