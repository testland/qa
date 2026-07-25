---
name: event-sourcing-tests
description: "Build event-sourcing tests - the given-events / when-command / then-events aggregate test, replay determinism (same events produce the same state), event-versioning + upcasting, snapshot equivalence (replay-to-N vs snapshot-at-N must agree), projection rebuild from the event log, and retroactive event correction. Per martinfowler.com EventSourcing reference. Use when an event-sourced aggregate gains a new event type or a changed payload schema, when snapshots are introduced to shorten replay, or when the event log is the audit system of record."
metadata:
  keywords: "event-sourcing, aggregate-replay, snapshot, upcasting, projection"
---

# event-sourcing-tests

Tests for an event-sourced system verify replay determinism, snapshot
equivalence, and version-evolution correctness - without them, the
event log silently drifts from the rebuilt state.

## When to use

- Domain model is event-sourced (orders, accounts, inventory).
- Audit / compliance requirements demand event log as system of
  record.
- Adding a new event type or changing payload schema - 
  retro-compat tests are mandatory.

## How to use

1. Write the aggregate's given-events / when-command / then-events test
   first (see Worked example) - it is the base every other check builds on.
2. Add a replay-determinism assertion: replay the same log twice and assert
   identical state; this catches `time.now()` / random-ID leaks at the source.
3. When snapshots are introduced, assert snapshot-at-N equals replay-to-N -
   see [references/snapshot-versioning-projections.md](references/snapshot-versioning-projections.md).
4. When an event type or payload schema changes, add versioned upcasters and a
   mixed-version replay test - see the references (versioning + upcasting).
5. For read models, assert projection rebuild from the log is idempotent and
   matches incremental application - see the references (projection rebuild).
6. Gate appends on optimistic concurrency (expected version) and suppress
   external calls in replay mode - see the references (concurrency, replay mode).

## Worked example - one event-sourced aggregate, end to end

The base test for any event-sourced aggregate is given-events /
when-command / then-events: seed the aggregate with its prior events,
handle one command, then assert the events it emits and the resulting
state. Per [Fowler - Event Sourcing], replay = "rebuild application
state from scratch by replaying events in order."

```python
def test_confirm_order_emits_order_confirmed():
    # GIVEN - the aggregate's prior event history
    history = [
        OrderCreated(order_id="o1", customer="c1"),
        ItemAdded(order_id="o1", sku="sku1", qty=2),
    ]
    order = OrderAggregate.replay(history)

    # WHEN - one command is handled
    new_events = order.handle(ConfirmOrder(order_id="o1"))

    # THEN - assert the emitted events, not only the final state
    assert new_events == [OrderConfirmed(order_id="o1")]

    # AND replay is deterministic: the same log rebuilds the same state
    state_a = OrderAggregate.replay(history + new_events)
    state_b = OrderAggregate.replay(history + new_events)
    assert state_a == state_b
    assert state_a.status == "confirmed"
    assert state_a.line_items == [("sku1", 2)]
```

If `handle` emits events derived from `time.now()` or random IDs,
`state_a == state_b` fails - the test catches non-deterministic replay
before it drifts the log from the rebuilt state.

Once this base test is green, layer on the operational checks -
order independence within causality, snapshot equivalence, event
versioning + upcasting, projection rebuild, retroactive correction,
replay-mode side-effect suppression, and optimistic-concurrency
appends - in
[references/snapshot-versioning-projections.md](references/snapshot-versioning-projections.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Replay calls `time.now()` / random IDs | Non-deterministic | Make replay deterministic (Worked example) |
| Skip snapshot equivalence test | Snapshots silently diverge | Assert snapshot-at-N == replay-to-N (references) |
| No upcasting plan; rewrite event store on schema change | Audit loss; downtime | Versioned upcasters (references) |
| Real email/HTTP calls during replay | Duplicate side effects | Replay-mode flag (references) |
| Append without expected version | Lost updates from concurrent writers | Optimistic concurrency (references) |

## Limitations

- Event-store implementations vary widely (EventStoreDB, Kafka,
  Postgres). Test against the actual store.
- Snapshot strategy choice (every N events, every X minutes) has
  performance implications outside this skill's scope.
- Cross-aggregate transactions are not part of event sourcing - 
  use sagas (`saga-transaction-tests`) for those.

## References

- [Fowler - Event Sourcing] - pattern overview, replay, snapshots,
  retroactive corrections, gateway considerations.
- [references/snapshot-versioning-projections.md](references/snapshot-versioning-projections.md) -
  the deep operational tests: order independence, snapshot equivalence,
  versioning + upcasting, projection rebuild, retroactive correction,
  replay-mode side effects, and optimistic-concurrency appends.
- `saga-transaction-tests` - 
  cross-aggregate transactions.
- `cqrs-projection-tests` - 
  projection-from-event-log testing.

[Fowler - Event Sourcing]: https://martinfowler.com/eaaDev/EventSourcing.html
