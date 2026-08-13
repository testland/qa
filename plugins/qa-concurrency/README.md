# qa-concurrency

Code-level concurrency + race-condition testing - distinct from
`qa-resilience` (infra fault) and `qa-distributed-tracing`
(observability). Four skills covering in-process data races (with the
full Go race-detector + goleak workflow in references), deadlock
detection, async ordering, and database isolation levels.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [race-condition-test-author](skills/race-condition-test-author/SKILL.md) | Build deterministic interleavings via barriers; ThreadSanitizer (`-fsanitize=thread`); Go `-race` + GORACE + goleak workflow in references/go.md; jcstress `@JCStressTest` + `@Actor` + `@Outcome`; Loom virtual-thread stress |
| Skill | [deadlock-detection-harness](skills/deadlock-detection-harness/SKILL.md) | Lock-order convention; lock-acquire-graph cycle detection (DFS); timed acquires + escalation; TSan `detect_deadlocks=1`; jstack / `gdb thread apply all bt` postmortem |
| Skill | [async-ordering-tests](skills/async-ordering-tests/SKILL.md) | Microtask vs macrotask; deterministic timers (Sinon / Vitest fake); Promise.all vs sequential await; asyncio gather/cancel propagation; Go channel happens-before |
| Skill | [mvcc-isolation-tests](skills/mvcc-isolation-tests/SKILL.md) | Two-connection harness; per-anomaly tests (dirty / non-repeatable / phantom / serialization / write skew); Read Committed → Repeatable Read → Serializable matrix per PostgreSQL; per-DB differences (PG / MySQL / SQL Server / DynamoDB) |
| Agent | [concurrency-critic](agents/concurrency-critic.md) | Adversarial static pass over concurrent code (threads / goroutines / async): unguarded shared mutable state, lock-ordering cycles (deadlock risk), missing happens-before / memory visibility, check-then-act races; emits findings table + BLOCK/PASS verdict |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-concurrency@testland-qa
```
