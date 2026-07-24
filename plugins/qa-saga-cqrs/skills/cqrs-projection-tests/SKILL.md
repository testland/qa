---
name: cqrs-projection-tests
description: "Build CQRS read-model projection tests - write-model + read-model consistency tests, projection-replay determinism, projection-versioning + zero-downtime swap, eventual-consistency-window assertions. Per martinfowler.com CQRS reference. Use when a read model is derived from a write-model event stream - adding a projection, migrating a projection schema, or chasing a \"I changed it but the UI shows the old value\" report."
metadata:
  keywords: "cqrs, projection, read-model, eventual-consistency, command-query-segregation"
---

# cqrs-projection-tests

Per [Fowler - CQRS], CQRS "splits commands and queries into distinct
models." Read-model (projection) is rebuilt from the write-model's
events. Tests verify the projection is correct + reproducible +
consistent within the documented eventual-consistency window.

## When to use

- A read-heavy bounded context where queries hit a denormalized
  projection rather than the write-model.
- Adding a new projection from an existing event stream.
- Migrating an existing projection schema (zero-downtime swap).

## Step 1 - Projection-from-events determinism

Per [Fowler - CQRS], the read model is "optimized for reading and
displaying information." Test that rebuilding from the same events
yields the same projection state:

```python
def test_projection_deterministic():
    events = load_test_events()

    proj_a = ProductCatalogProjection().apply_all(events)
    proj_b = ProductCatalogProjection().apply_all(events)

    assert proj_a.materialize() == proj_b.materialize()
```

If `apply_all` references current time / random IDs, projection
isn't deterministic - fix.

## Step 2 - Per-event projection update test

Each event should produce one well-defined change in the read model:

```python
@pytest.mark.parametrize("event,expected_delta", [
    (ProductPriceChanged(sku="sku1", new=120), {"sku1.price": 120}),
    (ProductDescUpdated(sku="sku1", desc="new"), {"sku1.desc": "new"}),
    (ProductRetired(sku="sku1"), {"sku1.active": False}),
])
def test_event_updates_projection(event, expected_delta):
    proj = ProductCatalogProjection({"sku1": {"price": 100, "desc": "old", "active": True}})
    proj.apply(event)

    materialized = proj.materialize()
    for path, value in expected_delta.items():
        sku, field = path.split(".")
        assert materialized[sku][field] == value
```

## Step 3 - Eventual-consistency window assertion

Per [Fowler - CQRS], CQRS pairs naturally with "event-based systems
and eventual consistency." Document the window + test:

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

When the projection is async (via message bus), this is the canonical
SLA test. If sync (in same DB transaction), no consistency window
exists - different test pattern.

## Step 4 - Multiple projections from same event stream

CQRS often has many projections (search index, materialized SQL
view, OLAP cube) per event stream. Test each independently:

```python
def test_search_index_projection():
    events = [...]
    search = SearchIndexProjection().apply_all(events)
    assert search.find("description LIKE '%phone%'") == [...]

def test_inventory_summary_projection():
    events = [...]
    summary = InventorySummaryProjection().apply_all(events)
    assert summary.total_skus == 1234
```

A flawed projection doesn't affect the others - test in isolation.

## Step 5 - Projection rebuild + zero-downtime swap

Schema migration of a projection ≈ rebuild from event log + swap.
Test the rebuild produces correct state for a known event range:

```python
def test_projection_rebuild_matches_known_state():
    historical_events = load_events(date_range=(start, end))
    rebuilt = ProductCatalogProjectionV2().apply_all(historical_events)

    expected = json.loads(Path("tests/fixtures/catalog_at_end.json").read_text())
    assert rebuilt.materialize() == expected
```

Verify the swap mechanic:

```python
def test_zero_downtime_swap():
    # Stand up new projection in parallel
    new_proj = SearchIndexProjectionV2()
    catchup_from_event_log(new_proj, until=current_position)

    # Verify new matches old at the swap point
    assert new_proj.materialize() == old_proj.materialize()

    # Subscribe new to live event stream
    subscribe(new_proj)
    # Switch reads to new - verify no read returns stale state
    swap_query_target(old_proj, new_proj)
```

## Step 6 - Idempotency: apply same event twice

Distributed projections may receive duplicates. Apply must be
idempotent (same final state when applied twice):

```python
def test_event_idempotent_on_projection():
    proj = ProductCatalogProjection()
    proj.apply(ProductCreated("sku1", "Phone"))
    proj.apply(ProductCreated("sku1", "Phone"))  # duplicate

    assert proj.materialize()["sku1"]["name"] == "Phone"
    assert len(proj.materialize()) == 1  # not 2
```

Track event IDs already applied per projection.

## Step 7 - Out-of-order delivery test

Async event delivery may reorder events. Test that the projection
either handles reordering or correctly waits/buffers:

```python
def test_projection_handles_out_of_order():
    proj = ProductCatalogProjection()

    # Out-of-order: Updated arrives before Created
    proj.apply(ProductUpdated("sku1", new_name="Phone v2", expected_version=1))
    proj.apply(ProductCreated("sku1", name="Phone v1", version=0))

    # If projection requires in-order, it should buffer + apply correctly
    assert proj.materialize()["sku1"]["name"] == "Phone v2"
```

If your projection assumes in-order (e.g., Kafka per-partition),
test the assumption holds end-to-end.

## Step 8 - Read-your-writes guard

CQRS often breaks "read your own write" expectations. Tests verify
the UI either:

- Waits for projection to catch up before showing post-action
  state, OR
- Returns a synthetic "pending" state from the write model.

```python
def test_post_command_returns_pending_until_projection_catches_up():
    response = api_client.post("/products", {"name": "Phone"})
    assert response.status == 202  # Accepted

    # Get returns "pending" until projection updates
    get1 = api_client.get(f"/products/{response.body['id']}")
    assert get1.body["status"] == "pending"

    wait_for_projection_to_catch_up(timeout=5)

    get2 = api_client.get(f"/products/{response.body['id']}")
    assert get2.body["status"] == "active"
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip eventual-consistency window test | Customer reports "I just changed the price; UI shows old" | Step 3 |
| Treat projection as "always current" with the write model | Subtle stale reads in prod | Document + assert window (Step 3) |
| Couple projection update to write transaction | Defeats CQRS scaling promise | Async projection (Step 3) |
| No rebuild test for projection | Schema migration becomes risky | Step 5 |
| Skip out-of-order test | Real systems reorder | Step 7 |

## Limitations

- CQRS adds complexity; per [Fowler - CQRS], "you should be very
  cautious about using CQRS." Tests don't reduce that complexity.
- Eventual-consistency window varies under load; test under
  realistic concurrency, not a quiet test bench.
- Read-model schema evolution is harder than write-model; full
  rebuild tests are essential.

## References

- [Fowler - CQRS] - pattern overview, command vs query model,
  cautions
- `event-sourcing-tests` - pairs
  with CQRS for event-sourced write models
- `saga-transaction-tests` - 
  cross-aggregate writes feeding the same projection
- `eventual-consistency-tests` - 
  window assertions across aggregates

[Fowler - CQRS]: https://martinfowler.com/bliki/CQRS.html
