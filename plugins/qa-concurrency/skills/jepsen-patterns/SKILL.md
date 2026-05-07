---
name: jepsen-patterns
description: "Reference for Jepsen-style distributed-systems testing — consistency models hierarchy (linearizability vs sequential vs causal vs monotonic-reads vs eventual), nemesis primitives (network partitions, clock skew, kill nodes), workload generators, Knossos + Elle linearizability checkers. Reference-only because Jepsen tests are typically Clojure-bespoke per system; use this skill to evaluate vendor claims and structure your own test."
type: skill
archetype: S2
rating: 22
d6: 4
keywords:
  - jepsen
  - linearizability
  - consistency-models
  - distributed-systems
  - nemesis
---

# jepsen-patterns

Per the [Jepsen consistency docs], "A consistency model is a safety
property which declares what a system can do." Jepsen tests
distributed databases by injecting faults (the *nemesis*) and
checking the operation history against a consistency model.

This skill is **reference-only** — Jepsen itself is a Clojure library
+ DSL; production tests are bespoke per database. Use this skill to:
read vendor "we passed Jepsen" claims with the right framing, scope a
custom Jepsen-style test, or evaluate a competing data-store choice.

## When to use

- Evaluating a distributed database vendor's consistency claims.
- Designing in-house consistency tests for a custom store
  (CRDT-based KV, custom replication).
- Onboarding to a system already tested by Jepsen — read
  the report intelligently.

## Step 1 — Map the consistency model your system claims

Per the [Jepsen consistency docs], models are organized by their
guarantees + the phenomena they prohibit:

| Model | Allowed phenomena | Forbidden phenomena |
|---|---|---|
| Linearizability | None — operations totally ordered respecting real time | Stale read, lost update, write skew |
| Sequential consistency | Per-process order respected; cross-process not real-time | Real-time-ordering violations |
| Causal consistency | Cause-before-effect respected | Causally unrelated operations may appear out of order |
| Monotonic reads | Once a read sees value v, no later read sees an older value | Cross-client divergence allowed |
| Eventual consistency | Convergence eventually | Stale reads, inconsistent windows |

Your system claims one of these (or a hybrid: snapshot isolation,
read-your-writes, etc.). The test must match the claim.

## Step 2 — Pick a nemesis

Nemesis primitives Jepsen ships:

| Nemesis | What it does |
|---|---|
| Partition | Splits the cluster into N groups; intra-group communication blocked |
| Crash | Hard-kills a process |
| Pause | SIGSTOPs a process (hangs without disconnecting) |
| Clock skew | jiggles `gettimeofday()` per-node |
| Slow disk | adds I/O latency |
| Bitflip | corrupts disk contents |

Combine nemeses (partition + crash + clock skew) to find compound
bugs.

## Step 3 — Generator: construct the workload

A Jepsen workload is per-client operations: invoke `read` / `write` /
`cas` / `append`, observe outcome (`ok` / `fail` / `info`).

Pseudocode shape (Jepsen DSL is Clojure):

```clojure
(generator/mix
  [{:f :read,  :value nil}
   {:f :write, :value (rand-int 100)}
   {:f :cas,   :value [old new]}])
```

Concurrent N clients hit the system; outcomes recorded as a
*history* (an ordered list of invocations + completions).

## Step 4 — Check the history with Knossos / Elle

| Checker | Use |
|---|---|
| **Knossos** | Linearizability checker for register-style ops (read/write/cas) |
| **Elle** | Transactional anomaly checker (G0/G1a/G1b/G1c, G-nonadjacent, G-single, G2-item, G2) — finds dirty/non-monotonic/non-repeatable read violations |

Both surface counterexamples (specific operation sequences) that
violate the claimed model. Counterexamples are the value: vendor
claim says "linearizable"; checker says "here's an op sequence that
isn't" → you have evidence.

## Step 5 — Workload patterns

Common workload shapes per consistency claim:

| Workload | Tests |
|---|---|
| Register (single-key R/W/CAS) | Linearizability of single-key |
| Append (per-key list, append + read) | Per-key history monotonicity |
| Set (insert + read all) | No lost insert; eventual visibility window |
| Bank transfer (txn-level read + write) | Transactional invariants (sum stays constant) |

Pick the workload closest to your system's user-facing invariants.

## Step 6 — Reading vendor Jepsen reports

Check for these red flags:

- "Tested at default isolation level" → vendor weakened isolation
  for the test.
- "With clock skew off" → clock skew is the typical-failure-mode
  for many distributed systems.
- "Without disk-fsync nemesis" → disk-flush bugs are a major class.
- Limited workload range → only `read/write`, no `cas` or
  transactions.

Per the [Jepsen consistency docs], Jepsen's value is that "consistency
models and phenomena are often defined in terms of dependencies" —
gaps in the test = gaps in confidence.

## Step 7 — In-house test scoping

For your own system (custom KV / custom replication):

1. Decide claim: what consistency level do you want to *guarantee*?
2. Compose nemesis: at minimum partition + crash; add clock skew if
   timestamps used.
3. Write workload: register-style for KV; bank-transfer-style for
   transactional.
4. Run with Knossos (register) or Elle (transactional).
5. Counterexamples → fix. Re-run. Add to CI suite.

Out-of-the-box Jepsen test rigs exist for many systems
(jepsen-io/jepsen GitHub); fork rather than start from scratch.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test under stable network only | Real production has partitions; bugs hide | Always include partition nemesis (Step 2) |
| Trust "we did our own consistency tests" without checker | Manual reasoning misses subtle violations | Use Knossos / Elle (Step 4) |
| Single-client workload | Concurrency bugs need concurrency | Multi-client generator (Step 3) |
| Skip clock skew if using NTP | NTP can step backward; bugs trigger | Include clock skew (Step 2) |
| Run for 60s | Bugs may take hours to surface | Run hours; bisect to specific operation in history |

## Limitations

- Jepsen is Clojure-first; Python / Go ports exist but lag in
  features.
- Test runs are infra-heavy: real cluster, real network, real disk.
  Cloud-friendly via Docker but expensive.
- Not all bugs reproduce 100% — expect probabilistic findings.
- This skill is a reference; actually running Jepsen requires
  Clojure familiarity + significant per-system engineering.

## References

- [Jepsen consistency docs] — model hierarchy, phenomena,
  dependencies
- jepsen-io/jepsen on GitHub — DSL, nemesis primitives, ready-made
  test rigs
- [`race-condition-test-author`](../race-condition-test-author/SKILL.md) —
  in-process race detection (Jepsen is for distributed)
- [`async-ordering-tests`](../async-ordering-tests/SKILL.md) — async
  ordering within a single process

[Jepsen consistency docs]: https://jepsen.io/consistency
