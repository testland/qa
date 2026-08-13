# Projection rebuild/swap and read-your-writes tests

Deep variants for event-sourcing-tests' projection-rebuild section
(zero-downtime swap and the read-your-writes guard). The SKILL.md spine
keeps the minimal rebuild test inline; these are the longer worked tests.

## Zero-downtime swap mechanic

Stand up the new projection in parallel, catch it up from the event log,
verify it matches the old projection at the swap point, subscribe it to
the live stream, then switch reads:

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

## Read-your-writes guard

The UI either waits for the projection to catch up, or returns a
synthetic "pending" state from the write model until the projection
converges:

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
