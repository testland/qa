# qa-concurrency

Code-level concurrency + race-condition testing — distinct from
`qa-chaos-resilience` (infra fault) and `qa-distributed-tracing`
(observability). Five skills covering distributed consistency,
in-process data races, deadlock detection, async ordering, and
database isolation levels.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [jepsen-patterns](skills/jepsen-patterns/SKILL.md) | S2 | Reference: consistency-model hierarchy (linearizability ↔ sequential ↔ causal ↔ monotonic-reads ↔ eventual); nemesis primitives (partition, crash, pause, clock skew); Knossos + Elle checkers; reading vendor reports |
| Skill | [race-condition-test-author](skills/race-condition-test-author/SKILL.md) | S3 | Build deterministic interleavings via barriers; ThreadSanitizer (`-fsanitize=thread`, Go `-race`); jcstress `@JCStressTest` + `@Actor` + `@Outcome`; Loom virtual-thread stress |
| Skill | [deadlock-detection-harness](skills/deadlock-detection-harness/SKILL.md) | S3 | Lock-order convention; lock-acquire-graph cycle detection (DFS); timed acquires + escalation; TSan `detect_deadlocks=1`; jstack / `gdb thread apply all bt` postmortem |
| Skill | [async-ordering-tests](skills/async-ordering-tests/SKILL.md) | S3 | Microtask vs macrotask; deterministic timers (Sinon / Vitest fake); Promise.all vs sequential await; asyncio gather/cancel propagation; Go channel happens-before |
| Skill | [mvcc-isolation-tests](skills/mvcc-isolation-tests/SKILL.md) | S3 | Two-connection harness; per-anomaly tests (dirty / non-repeatable / phantom / serialization / write skew); Read Committed → Repeatable Read → Serializable matrix per PostgreSQL; per-DB differences (PG / MySQL / SQL Server / DynamoDB) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-concurrency@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
