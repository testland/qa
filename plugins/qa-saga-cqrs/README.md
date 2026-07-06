# qa-saga-cqrs

Distributed-transaction patterns: sagas (replace 2PC across
microservices), event sourcing (events as system of record), CQRS
(separate write/read models), and the eventual-consistency window
that holds them together.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [saga-critic](agents/saga-critic.md) | Audits saga orchestrators and event-sourcing write paths for missing compensating transactions, non-idempotent compensations, dual-write without outbox, absent retry policy, and missing optimistic-concurrency guard on event append. Emits BLOCK / PASS verdict. |
| Skill | [saga-transaction-tests](skills/saga-transaction-tests/SKILL.md) | Orchestration vs choreography; per-step compensating-action verification; partial-failure matrix; outbox pattern atomicity; saga timeout |
| Skill | [event-sourcing-tests](skills/event-sourcing-tests/SKILL.md) | Aggregate-replay determinism; snapshot equivalence; event-versioning + upcasting; projection rebuild from event log; replay-mode external-call suppression |
| Skill | [cqrs-projection-tests](skills/cqrs-projection-tests/SKILL.md) | Per-event projection update; eventual-consistency window assertion; multiple projections per stream; zero-downtime swap; idempotency + out-of-order delivery |
| Skill | [eventual-consistency-tests](skills/eventual-consistency-tests/SKILL.md) | Convergence-window assertions; monotonic-read tests; anti-entropy / read-repair; CRDT merge tests (G-Counter, LWW, OR-Set); vector-clock causality |
| Skill | [outbox-pattern-test-author](skills/outbox-pattern-test-author/SKILL.md) | Tests the transactional outbox: atomic write+event, relay at-least-once + dedup + ordering + retry. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-saga-cqrs@testland-qa
```
