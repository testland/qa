# Event-sourcing tests - snapshots, versioning, projections, concurrency

Deep reference for the `event-sourcing-tests` SKILL.md. Consult after the
base given-events / when-command / then-events test (in SKILL.md) is green,
when adding snapshots, evolving event schemas, rebuilding projections, or
hardening appends against concurrent writers.

## Order independence within causality

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

## Snapshot equivalence

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

## Event versioning + upcasting

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

## Projection rebuild from the event log

Read models (projections) are derived from events. Rebuild from
scratch must produce the same result:

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

## Retroactive event correction

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

## External system integration during replay

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

## Optimistic concurrency on append

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

[Fowler - Event Sourcing]: https://martinfowler.com/eaaDev/EventSourcing.html
