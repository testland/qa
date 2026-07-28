# CRDT merge and vector-clock tests

Deep variants for eventual-consistency-tests Step 5 (CRDT merge) and
Step 6 (vector-clock causality). The SKILL.md spine keeps the G-Counter
merge test inline; these are the remaining CRDT registers/sets and the
vector-clock causality test.

## LWW-register merge (last-write-wins)

```python
def test_lww_register_picks_higher_timestamp():
    """LWW (Last-Write-Wins) register: higher timestamp wins."""
    reg1 = LWWRegister(value="A", ts=100)
    reg2 = LWWRegister(value="B", ts=200)

    merged = reg1.merge(reg2)
    assert merged.value == "B"  # later timestamp wins
```

## OR-Set concurrent add/remove

```python
def test_or_set_handles_concurrent_add_remove():
    """OR-Set: concurrent add + remove of same elem → element present."""
    set1 = ORSet().add("x", actor="a")
    set2 = set1.copy()

    set1 = set1.remove("x")  # actor=a removes
    set2 = set2.add("x", actor="b")  # actor=b adds again concurrently

    merged = set1.merge(set2)
    assert "x" in merged.elements()  # add wins on conflict
```

## Vector-clock causality

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
