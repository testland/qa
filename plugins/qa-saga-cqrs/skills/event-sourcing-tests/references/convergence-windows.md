# Convergence-window tests

"Eventually consistent" is untestable without a bound. These tests bind
the window and assert convergence - for async projections, multi-region
replication, and any read model that lags its write model. Per
[Fowler - CQRS](https://martinfowler.com/bliki/CQRS.html), CQRS pairs
naturally with "event-based systems and eventual consistency" - so the
window is part of the contract, and the test asserts the contract.

## Define the window per workflow

Document target windows first; each becomes one test:

| Workflow | Target window | Source |
|---|---|---|
| Read model after a command | ≤ 5s | SLA |
| Cart update visibility across regions | ≤ 2s P95 | SLA |
| Search index update after product change | ≤ 30s | Product spec |
| Audit log replication to backup region | ≤ 60s | Compliance |

## The canonical assertion - deadline + poll + assert

```python
def test_projection_catches_up_within_5_seconds():
    """SLA: read model converges within 5s of write."""
    write_model.execute(ChangePriceCommand(sku="sku1", new=150))

    deadline = time.time() + 5.0
    while time.time() < deadline:
        if read_model.get_price("sku1") == 150:
            return  # converged in time
        time.sleep(0.1)

    pytest.fail("Read model did not converge within 5s")
```

The exact window is per-system; the pattern is always
deadline + poll + assert. When the projection is synchronous (same DB
transaction) no window exists - this test does not apply. On failure,
check consumer lag / message-bus backlog before blaming the projection.

The same shape covers cross-region replication - write in one region,
poll the other:

```python
def test_cart_update_converges_within_2s_across_regions():
    cart_service_us.add_item(user_id="u1", sku="sku1")
    deadline = time.time() + 2.0
    while time.time() < deadline:
        if any(i.sku == "sku1" for i in cart_service_eu.get(user_id="u1").items):
            return
        time.sleep(0.05)
    pytest.fail("Cart did not converge across regions within 2s")
```

## Monotonic-read test

A session must never see a value older than one it already read:

```python
def test_monotonic_reads_per_session():
    session = client.connect(read_preference="monotonic")
    initial = session.get("counter")
    for _ in range(100):
        v = session.get("counter")
        assert v >= initial, f"Read regressed: {initial} -> {v}"
```

## Bounded-staleness assertion

Distinct from the convergence window: "all reads no more than X seconds
stale":

```python
def test_bounded_staleness_under_2_seconds():
    leader.write("counter", time.time())
    time.sleep(2.5)  # exceed the bound
    for replica in replicas:
        staleness = time.time() - float(replica.read("counter"))
        assert staleness <= 2.0, f"Replica {replica} stale by {staleness:.2f}s"
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "Eventually consistent" with no time bound | Untestable; can hang | Define + assert a window |
| Read-after-write expecting immediate freshness | Defeats async replication | Test the contracted window |
| Quiet-test-bench windows only | Convergence degrades under load | Test under realistic concurrency |
| Single-region cluster in tests | Cross-region drift never surfaces | Multi-region setup or simulation |

## Limitations

- Real convergence depends on load, network, and clock drift;
  bench results don't predict prod.
- Some stores offer strong-read modes that bypass eventual semantics -
  verify which mode the test exercises.

## References

- [Fowler - CQRS](https://martinfowler.com/bliki/CQRS.html) -
  read-model eventual-consistency framing
- [Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) -
  replay determinism foundation
