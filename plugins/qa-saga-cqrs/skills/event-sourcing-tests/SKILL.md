---
name: event-sourcing-tests
description: "Build event-sourcing tests - aggregate root replay determinism (same events ⇒ same state), event-versioning + upcasting, snapshot equivalence (replay-to-N vs snapshot-at-N must agree), projection rebuild from event log, retroactive event correction. Per martinfowler.com EventSourcing reference. Use when an event-sourced aggregate gains a new event type or a changed payload schema, when snapshots are introduced to shorten replay, or when the event log is the audit system of record."
metadata:
  keywords: "event-sourcing, aggregate-replay, snapshot, upcasting, projection"
---

# event-sourcing-tests

Per [Fowler - Event Sourcing], "all changes to application state are
stored as a sequence of events." Tests verify replay determinism,
snapshot equivalence, and version-evolution correctness - without
these, the event log silently drifts from the rebuilt state.

## When to use

- Domain model is event-sourced (orders, accounts, inventory).
- Audit / compliance requirements demand event log as system of
  record.
- Adding a new event type or changing payload schema - 
  retro-compat tests are mandatory.

## Step 1 - Replay determinism test

Per [Fowler - Event Sourcing], replay = "rebuild application state
from scratch by replaying events in order." Same input → same
state, every time:

```python
def test_replay_is_deterministic():
    events = [
        OrderCreated(order_id="o1", customer="c1", at=t0),
        ItemAdded(order_id="o1", sku="sku1", qty=2, at=t1),
        ItemAdded(order_id="o1", sku="sku2", qty=1, at=t2),
        OrderConfirmed(order_id="o1", at=t3),
    ]

    state_a = OrderAggregate.replay(events)
    state_b = OrderAggregate.replay(events)

    assert state_a == state_b
    assert state_a.status == "confirmed"
    assert state_a.line_items == [("sku1", 2), ("sku2", 1)]
```

If `replay` references `time.now()` or random IDs, replay isn't
deterministic - test catches.

## Step 2 - Order independence within causality

Within a single aggregate, events ARE causally ordered. Across
aggregates, only causal events are ordered. Test the boundary:

```python
def test_unrelated_aggregates_replay_independently():
    # Two orders; events interleaved in the log
    log = [
        OrderCreated("o1", "c1"),
        OrderCreated("o2", "c2"),
        ItemAdded("o2", "sku2", 1),
        ItemAdded("o1", "sku1", 2),
        OrderConfirmed("o2"),
        OrderConfirmed("o1"),
    ]

    o1 = OrderAggregate.replay(filter(lambda e: e.order_id == "o1", log))
    o2 = OrderAggregate.replay(filter(lambda e: e.order_id == "o2", log))

    assert o1.line_items == [("sku1", 2)]
    assert o2.line_items == [("sku2", 1)]
```

## Step 3 - Snapshot equivalence

Snapshots cache replayed state at version N. Per [Fowler - Event
Sourcing], "Most implementations cache the current application
state, using snapshots to avoid replaying thousands of events."

Test snapshot at version N == replay-to-version N:

```python
def test_snapshot_equivalent_to_full_replay():
    events = [...]  # 1000 events

    full_replay = OrderAggregate.replay(events)
    snapshot = OrderAggregate.snapshot_at(events, version=500)
    after_snapshot = OrderAggregate.from_snapshot(snapshot).apply_from(events[500:])

    assert full_replay == after_snapshot
```

If snapshot diverges, snapshot-creation logic is broken or events
post-snapshot apply differently than they did during snapshot
creation.

## Step 4 - Event versioning + upcasting

Schema evolves: `ItemAdded(sku, qty)` → `ItemAdded(sku, qty,
unit_price)`. Old events lack `unit_price` - upcast on read.

```python
def test_upcasting_v1_to_v2():
    v1_event = {"type": "ItemAdded", "version": 1, "sku": "sku1", "qty": 2}
    v2_event = upcast_v1_v2(v1_event)

    assert v2_event["version"] == 2
    assert v2_event["unit_price"] is None  # or default per business rule
    assert v2_event["sku"] == "sku1"
    assert v2_event["qty"] == 2
```

Test that replaying with a mix of v1 + v2 events produces the same
state as if all were v2:

```python
def test_replay_handles_mixed_event_versions():
    mixed = [v1_event, v2_event, v1_event]
    upgraded = [upcast(e) for e in mixed]

    state_via_upcast = OrderAggregate.replay(upgraded)
    assert state_via_upcast.line_items_count == 3
```

## Step 5 - Projection rebuild from event log

Read models (projections) are derived from events. Rebuild from
scratch must produce same result:

```python
def test_projection_rebuild_idempotent():
    events = load_events()
    projection_a = build_projection(events)
    projection_b = build_projection(events)
    assert projection_a == projection_b

    # And rebuild from cleared state matches incremental update
    projection_c = SearchProjection()
    for evt in events:
        projection_c.apply(evt)
    assert projection_c == projection_a
```

When projection logic changes, drop the materialized view and
rebuild from events - test the rebuild matches expectations.

## Step 6 - Retroactive event correction

Per [Fowler - Event Sourcing], "Incorrect past events can be
reversed and corrected, with downstream consequences automatically
recalculated."

```python
def test_retroactive_correction_recomputes():
    # Original state: order o1 has 2 items
    events_v1 = [OrderCreated("o1"), ItemAdded("o1", "sku1", 2)]
    state_v1 = OrderAggregate.replay(events_v1)
    assert state_v1.total_items == 2

    # Discover ItemAdded was wrong (qty 5, not 2). Two strategies:
    # (a) Append correction event:
    events_v1.append(ItemQtyCorrected("o1", "sku1", new_qty=5))
    state_corrected = OrderAggregate.replay(events_v1)
    assert state_corrected.total_items == 5

    # (b) Or replace the original event in the log + replay:
    events_v2 = [OrderCreated("o1"), ItemAdded("o1", "sku1", 5)]
    state_replayed = OrderAggregate.replay(events_v2)
    assert state_replayed.total_items == 5
```

Strategy (a) preserves audit trail (corrections visible).
Strategy (b) requires careful migration but produces a clean log.
Tests verify both yield the right final state.

## Step 7 - External system integration during replay

Per [Fowler - Event Sourcing]: "Gateways must distinguish between
real processing and replay modes to avoid sending duplicate
notifications or using stale data."

```python
def test_replay_mode_suppresses_external_calls():
    email_gateway = MockEmailGateway()

    handler = OrderConfirmedHandler(email_gateway, mode="replay")
    handler.handle(OrderConfirmed("o1"))

    assert email_gateway.sent_count == 0  # replay mode = no real calls

def test_live_mode_invokes_external_calls():
    email_gateway = MockEmailGateway()

    handler = OrderConfirmedHandler(email_gateway, mode="live")
    handler.handle(OrderConfirmed("o1"))

    assert email_gateway.sent_count == 1
```

## Step 8 - Concurrency: optimistic concurrency on append

Append must check expected version:

```python
def test_concurrent_append_rejected():
    events = [OrderCreated("o1")]
    store.append("o1", events, expected_version=0)  # OK; new version = 1

    # Two concurrent commands both load version=1 + try to append
    new_events_a = [ItemAdded("o1", "sku1", 1)]
    new_events_b = [ItemAdded("o1", "sku2", 1)]

    store.append("o1", new_events_a, expected_version=1)  # OK; new version = 2

    with pytest.raises(ConcurrencyConflict):
        store.append("o1", new_events_b, expected_version=1)  # already at 2
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Replay calls `time.now()` / random IDs | Non-deterministic | Make replay deterministic (Step 1) |
| Skip snapshot equivalence test | Snapshots silently diverge | Step 3 |
| No upcasting plan; rewrite event store on schema change | Audit loss; downtime | Versioned upcasters (Step 4) |
| Real email/HTTP calls during replay | Duplicate side effects | Replay-mode flag (Step 7) |
| Append without expected version | Lost updates from concurrent writers | Optimistic concurrency (Step 8) |

## Limitations

- Event-store implementations vary widely (EventStoreDB, Kafka,
  Postgres). Test against the actual store.
- Snapshot strategy choice (every N events, every X minutes) has
  performance implications outside this skill's scope.
- Cross-aggregate transactions are not part of event sourcing - 
  use sagas (`saga-transaction-tests`) for those.

## References

- [Fowler - Event Sourcing] - pattern overview, replay, snapshots,
  retroactive corrections, gateway considerations
- [`saga-transaction-tests`](../saga-transaction-tests/SKILL.md) - 
  cross-aggregate transactions
- [`cqrs-projection-tests`](../cqrs-projection-tests/SKILL.md) - 
  projection-from-event-log testing

[Fowler - Event Sourcing]: https://martinfowler.com/eaaDev/EventSourcing.html
