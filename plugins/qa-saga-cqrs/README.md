# qa-saga-cqrs

Distributed-transaction patterns: sagas (replace 2PC across
microservices), event sourcing (events as system of record), CQRS
(separate write/read models), and the eventual-consistency window
that holds them together.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [saga-transaction-tests](skills/saga-transaction-tests/SKILL.md) | S3 | Orchestration vs choreography; per-step compensating-action verification; partial-failure matrix; outbox pattern atomicity; saga timeout |
| Skill | [event-sourcing-tests](skills/event-sourcing-tests/SKILL.md) | S3 | Aggregate-replay determinism; snapshot equivalence; event-versioning + upcasting; projection rebuild from event log; replay-mode external-call suppression |
| Skill | [cqrs-projection-tests](skills/cqrs-projection-tests/SKILL.md) | S3 | Per-event projection update; eventual-consistency window assertion; multiple projections per stream; zero-downtime swap; idempotency + out-of-order delivery |
| Skill | [eventual-consistency-tests](skills/eventual-consistency-tests/SKILL.md) | S3 | Convergence-window assertions; monotonic-read tests; anti-entropy / read-repair; CRDT merge tests (G-Counter, LWW, OR-Set); vector-clock causality |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-saga-cqrs@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components**. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
