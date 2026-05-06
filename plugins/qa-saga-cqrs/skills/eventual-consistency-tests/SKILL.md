---
name: eventual-consistency-tests
description: Build eventual-consistency tests — convergence-window assertions ("within 5s"), monotonic-read tests, anti-entropy tests, conflict-resolution rules tests (CRDT-merge / LWW / vector clocks). Distinguishes "eventually" from "never" by asserting bounded convergence; pair with qa-saga-cqrs for saga + CQRS workloads.
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - eventual-consistency
  - convergence
  - monotonic-reads
  - crdt
  - vector-clocks
---

# eventual-consistency-tests

"Eventually consistent" is a system property; "eventually" without
a bound is not testable. Tests bind the window, assert
convergence, and verify conflict-resolution rules.

## When to use

- Distributed cache (Redis cluster), multi-region database, CRDT
  store, async-projection CQRS read model.
- SLA promises "data converges within X seconds" — test the
  bound.
- Replicated counters, sets, registers (CRDTs) — verify merge
  semantics.

## Step 1 — Define the convergence window per workflow

Document target windows:

| Workflow | Target window | Source |
|---|---|---|
| Cart update visibility across regions | ≤ 2s P95 | SLA |
| Search index update after product change | ≤ 30s | Product spec |
| Audit log replication to backup region | ≤ 60s | Compliance |
| User profile update across mobile + web | ≤ 5s | UX requirement |

Tests assert each.

## Step 2 — Convergence-window assertion test

```python
def test_cart_update_converges_within_2s_across_regions():
    cart_service_us.add_item(user_id="u1", sku="sku1")

    deadline = time.time() + 2.0
    while time.time() < deadline:
        eu_cart = cart_service_eu.get(user_id="u1")
        if any(item.sku == "sku1" for item in eu_cart.items):
            return
        time.sleep(0.05)

    pytest.fail("Cart did not converge across regions within 2s")
```

The exact window is per-system; the *test pattern* is
deadline + poll + assert.

## Step 3 — Monotonic-read test

Monotonic reads = "Once a read sees value v, no later read sees an
older value." Critical for clients that read-after-write.

```python
def test_monotonic_reads_per_session():
    session = client.connect(read_preference="monotonic")
    initial = session.get("counter")  # = 5

    # Even if the write-leader replicates lazily, this session
    # never sees a value < initial
    for _ in range(100):
        v = session.get("counter")
        assert v >= initial, f"Read regressed: {initial} → {v}"
```

Without monotonic-read guarantee, two sequential reads can return
non-monotonic values (read from a stale replica after first
read hit a fresher one).

## Step 4 — Anti-entropy / repair test

Anti-entropy: a background process that detects and repairs
divergence between replicas. Test that divergence eventually
self-heals:

```python
def test_anti_entropy_repairs_drift():
    # Simulate write to leader; suppress replication to follower
    leader.write("k1", "v1")
    pause_replication(leader, follower)
    leader.write("k1", "v2")
    resume_replication(leader, follower)

    # Manual replication path failed; rely on anti-entropy
    deadline = time.time() + 60
    while time.time() < deadline:
        if follower.read("k1") == "v2":
            return
        time.sleep(2.0)

    pytest.fail("Anti-entropy did not repair within 60s")
```

## Step 5 — CRDT merge tests

For CRDT-based stores (Riak, Redis-CRDT, AntidoteDB, Yjs, Automerge),
test the merge semantics directly:

```python
def test_g_counter_merges_to_max_per_actor():
    """G-Counter (grow-only counter) merge = max per actor."""
    counter_a = GCounter(actor="a")
    counter_b = GCounter(actor="b")

    counter_a.increment(3)  # {a: 3}
    counter_b.increment(5)  # {b: 5}

    merged = counter_a.merge(counter_b)
    assert merged.value() == 8  # 3 + 5

def test_lww_register_picks_higher_timestamp():
    """LWW (Last-Write-Wins) register: higher timestamp wins."""
    reg1 = LWWRegister(value="A", ts=100)
    reg2 = LWWRegister(value="B", ts=200)

    merged = reg1.merge(reg2)
    assert merged.value == "B"  # later timestamp wins

def test_or_set_handles_concurrent_add_remove():
    """OR-Set: concurrent add + remove of same elem → element present."""
    set1 = ORSet().add("x", actor="a")
    set2 = set1.copy()

    set1 = set1.remove("x")  # actor=a removes
    set2 = set2.add("x", actor="b")  # actor=b adds again concurrently

    merged = set1.merge(set2)
    assert "x" in merged.elements()  # add wins on conflict
```

Per CRDT theory: merge must be commutative, associative, idempotent
(CmRDT) or use a join-semilattice (CvRDT).

## Step 6 — Vector-clock causality test

```python
def test_vector_clock_orders_causal_events():
    # Three nodes; each maintains a vector clock
    vc_a = {"a": 0, "b": 0, "c": 0}

    # Node A writes
    vc_a["a"] += 1  # {a: 1, b: 0, c: 0}

    # Node B receives A's update
    vc_b = merge_vector_clocks({"a": 0, "b": 0, "c": 0}, vc_a)
    vc_b["b"] += 1  # {a: 1, b: 1, c: 0}

    # Concurrent: Node C makes an independent write
    vc_c_new = {"a": 0, "b": 0, "c": 1}

    # Test: B's clock and C's clock are concurrent (neither dominates)
    assert not dominates(vc_b, vc_c_new)
    assert not dominates(vc_c_new, vc_b)

    # B's clock dominates the original
    original = {"a": 0, "b": 0, "c": 0}
    assert dominates(vc_b, original)
```

Conflict-resolution rules use causality: dominates → prefer the
descendant; concurrent → tiebreak per business rule (LWW, merge).

## Step 7 — Read-repair on inconsistent quorum

```python
def test_read_repair_propagates_freshest_value():
    """Quorum read sees mismatched values; system writes back the freshest."""
    cluster.write("k1", "v1", consistency="quorum")
    pause_replication_to(node_3)
    cluster.write("k1", "v2", consistency="quorum")

    # node_3 still has v1; node_1 + node_2 have v2
    assert node_1.local_read("k1") == "v2"
    assert node_2.local_read("k1") == "v2"
    assert node_3.local_read("k1") == "v1"

    # Quorum read sees mismatch → triggers read-repair
    cluster.read("k1", consistency="quorum")
    time.sleep(2.0)

    # node_3 should now have v2
    assert node_3.local_read("k1") == "v2"
```

## Step 8 — Bounded staleness assertion

Distinct from window: "all reads no more than X seconds stale":

```python
def test_bounded_staleness_under_2_seconds():
    leader.write("counter", time.time())
    time.sleep(2.5)  # exceed bound

    for replica in replicas:
        ts = float(replica.read("counter"))
        staleness = time.time() - ts
        assert staleness <= 2.0, f"Replica {replica} stale by {staleness:.2f}s"
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test "eventually consistent" with no time bound | Untestable; can hang | Define + assert window (Step 1, Step 2) |
| Skip CRDT merge property tests | Subtle merge bugs ship | Step 5 |
| Read after write, expect immediate freshness | Defeats async replication | Test the contracted window |
| Use single-region cluster for tests | Doesn't surface cross-region drift | Multi-region setup or simulation |
| No anti-entropy test | Drift accumulates; never detected | Step 4 |

## Limitations

- Real-world convergence depends on load + network + clock
  drift; quiet-test-bench results don't predict prod.
- Some "eventually consistent" stores (DynamoDB strong reads) have
  modes that bypass eventual semantics — verify which mode tests
  exercise.
- CRDT property tests benefit from property-based testing
  (`qa-property-based`) — combine.

## References

- [Fowler — Event Sourcing] — replay determinism foundation
- [Fowler — CQRS] — read-model eventual-consistency framing
- [`saga-transaction-tests`](../saga-transaction-tests/SKILL.md),
  [`event-sourcing-tests`](../event-sourcing-tests/SKILL.md),
  [`cqrs-projection-tests`](../cqrs-projection-tests/SKILL.md) —
  sister skills
- CRDT theory — Shapiro et al., "A comprehensive study of
  Convergent and Commutative Replicated Data Types" (INRIA report)
- [`mvcc-isolation-tests`](../../qa-concurrency/skills/mvcc-isolation-tests/SKILL.md) —
  per-DB transaction isolation (different consistency dimension)

[Fowler — Event Sourcing]: https://martinfowler.com/eaaDev/EventSourcing.html
[Fowler — CQRS]: https://martinfowler.com/bliki/CQRS.html
