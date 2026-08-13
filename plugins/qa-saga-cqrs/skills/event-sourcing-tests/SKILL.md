---
name: event-sourcing-tests
description: "Build event-sourcing + CQRS tests - the given-events / when-command / then-events aggregate test, replay determinism (same events produce the same state), event-versioning + upcasting, snapshot equivalence (replay-to-N vs snapshot-at-N must agree), retroactive event correction, and CQRS read-model projection tests (per-event projection deltas, idempotent + out-of-order apply, rebuild + zero-downtime swap, read-your-writes guard) with eventual-consistency convergence-window assertions in references/convergence-windows.md. Per martinfowler.com EventSourcing + CQRS references. Use when an event-sourced aggregate gains a new event type or a changed payload schema, when snapshots are introduced to shorten replay, when a read model is projected from the event stream, or when a documented convergence window needs a test."
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
5. For read models, add the projection tests below - determinism,
   idempotent + out-of-order apply, rebuild + swap - and assert the
   documented convergence window per
   [references/convergence-windows.md](references/convergence-windows.md).
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

## Projection rebuild (CQRS read models)

Per [Fowler - CQRS], the read model is rebuilt from the write model's
event stream; test it like the aggregate - deterministic, idempotent,
rebuildable:

1. **Determinism** - `apply_all(events)` twice yields the same
   materialized state; current-time / random-ID reads in `apply` break it.
2. **Per-event delta** - each event type produces one well-defined change
   (parameterize: `ProductPriceChanged` → `{"sku1.price": 120}`, etc.).
3. **Idempotent apply** - the same event applied twice leaves state
   unchanged (track applied event IDs per projection).
4. **Out-of-order delivery** - the projection buffers or versions when
   `Updated` arrives before `Created`; if it assumes in-order (Kafka
   per-partition), test that assumption end-to-end.
5. **Rebuild + zero-downtime swap** - rebuild from a known event range
   and compare to a fixture; at the swap point assert
   `new_proj.materialize() == old_proj.materialize()` before switching
   reads. Full swap mechanic + the read-your-writes guard (202 Accepted →
   pending → active) are in
   [references/rebuild-swap-and-read-your-writes.md](references/rebuild-swap-and-read-your-writes.md).
6. **Convergence window** - async projections lag; document the window
   ("read model converges within 5s of write") and assert it with the
   deadline + poll + assert pattern in
   [references/convergence-windows.md](references/convergence-windows.md),
   which also covers monotonic-read and bounded-staleness assertions.

Test each projection off one stream independently (search index,
materialized SQL view, OLAP cube) so a flawed one doesn't mask the others.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Replay calls `time.now()` / random IDs | Non-deterministic | Make replay deterministic (Worked example) |
| Skip snapshot equivalence test | Snapshots silently diverge | Assert snapshot-at-N == replay-to-N (references) |
| No upcasting plan; rewrite event store on schema change | Audit loss; downtime | Versioned upcasters (references) |
| Real email/HTTP calls during replay | Duplicate side effects | Replay-mode flag (references) |
| Append without expected version | Lost updates from concurrent writers | Optimistic concurrency (references) |
| Skip the convergence-window test | "I changed it but the UI shows the old value" | Assert the window (references/convergence-windows.md) |
| Treat the projection as always-current | Subtle stale reads in prod | Document + assert the window |
| No rebuild test for a projection | Schema migration becomes risky | Rebuild + swap tests (projection section) |

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
- [Fowler - CQRS] - command/query split, read-model framing, cautions.
- [references/snapshot-versioning-projections.md](references/snapshot-versioning-projections.md) -
  the deep operational tests: order independence, snapshot equivalence,
  versioning + upcasting, projection rebuild, retroactive correction,
  replay-mode side effects, and optimistic-concurrency appends.
- [references/rebuild-swap-and-read-your-writes.md](references/rebuild-swap-and-read-your-writes.md) -
  zero-downtime swap + read-your-writes worked tests.
- [references/convergence-windows.md](references/convergence-windows.md) -
  convergence-window, monotonic-read, and bounded-staleness assertions.
- `saga-transaction-tests` - 
  cross-aggregate transactions.

[Fowler - Event Sourcing]: https://martinfowler.com/eaaDev/EventSourcing.html
[Fowler - CQRS]: https://martinfowler.com/bliki/CQRS.html
