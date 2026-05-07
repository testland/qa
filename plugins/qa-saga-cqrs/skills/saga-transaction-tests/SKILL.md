---
name: saga-transaction-tests
description: "Build saga transaction tests — orchestration vs choreography variants, per-step compensating-action verification, partial-failure scenarios (Step 3 fails → Steps 1+2 must compensate), idempotency of compensations, outbox pattern for atomic DB-update + message-publish. Per microservices.io/saga; tests guard against ACD-without-Isolation anomalies."
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - saga
  - distributed-transaction
  - compensating-transaction
  - orchestration
  - choreography
---

# saga-transaction-tests

Per [microservices.io/saga], a saga is "a sequence of local
transactions. Each local transaction updates the database and
publishes a message or event to trigger the next local transaction
in the saga." Sagas guarantee Atomicity / Consistency / Durability
but sacrifice the I (Isolation) — tests verify both happy-path
completion AND every failure-and-compensate path.

## When to use

- Microservice transactions span ≥ 2 services (e.g., order →
  payment → fulfillment).
- Replacing distributed-2PC with sagas; need test coverage of
  every compensating path.
- Pre-deployment after compensation logic changes — partial
  failures are the canonical untested code path.

## Step 1 — Pick orchestration or choreography

Per [microservices.io/saga]:

| Style | How |
|---|---|
| **Orchestration** | Central orchestrator commands each step; explicit state machine |
| **Choreography** | Services publish domain events; subsequent services react autonomously |

Orchestration → easier to test (state machine has clear edges).
Choreography → harder to test (event flows are emergent).

## Step 2 — Identify steps + compensations

For an order-creation saga:

| Step | Forward action | Compensation |
|---|---|---|
| 1. Reserve inventory | `inventory.reserve(items)` | `inventory.release(reservation_id)` |
| 2. Charge payment | `payments.charge(amount)` | `payments.refund(charge_id)` |
| 3. Create shipment | `shipping.create(order_id)` | (none — last step) |

Document this table; tests assert one row at a time.

## Step 3 — Happy-path orchestration test

```python
def test_orchestration_completes_all_steps():
    saga = OrderSaga(orchestrator)
    result = saga.execute(items=[item], amount=100)

    assert result.status == "COMPLETED"
    assert inventory.reserved_for(saga.id) == [item]
    assert payments.charges_for(saga.id) == [100]
    assert shipping.shipments_for(saga.id) is not None
```

## Step 4 — Per-failure compensation test

For each step, test that failure triggers compensation of all prior
steps. Use mock failures + parametrize:

```python
import pytest

@pytest.mark.parametrize("fail_at", [1, 2, 3])
def test_failure_at_step_triggers_compensation(fail_at):
    inventory_mock.fail_after_n_calls = fail_at if fail_at == 1 else None
    payments_mock.fail_after_n_calls = fail_at if fail_at == 2 else None
    shipping_mock.fail_after_n_calls = fail_at if fail_at == 3 else None

    saga = OrderSaga(orchestrator)
    with pytest.raises(SagaFailedError):
        saga.execute(items=[item], amount=100)

    # Assert compensations
    if fail_at >= 2:  # inventory was reserved
        assert inventory_mock.release_called == 1
    if fail_at >= 3:  # payment was charged
        assert payments_mock.refund_called == 1
```

The matrix of failure points × compensation invocations is the test
suite.

## Step 5 — Idempotency of compensations

Per [microservices.io/saga], compensations must be idempotent
because retries happen during partial failure. Test:

```python
def test_compensation_idempotent():
    inventory.reserve(item)
    inventory.release("res-001")
    inventory.release("res-001")  # second call — should be no-op
    assert inventory.reservation_count == 0  # not -1
    assert inventory.release_invocations == 2  # both recorded
```

Compensations that aren't idempotent → double-refund, double-release.

## Step 6 — Outbox pattern test

Per [microservices.io/saga], "Services must atomically update
databases AND publish messages/events." The Outbox pattern: write
the event to a local DB table in the same transaction; a separate
process polls the outbox + publishes.

```python
def test_outbox_atomicity_under_db_failure():
    with pytest.raises(SimulatedDBError):
        with db_transaction():
            db.execute("INSERT INTO orders ...")
            db.execute("INSERT INTO outbox (event) VALUES (...)")
            raise SimulatedDBError()  # mid-transaction fail

    # Both must roll back
    assert db.query("SELECT COUNT(*) FROM orders").scalar() == 0
    assert db.query("SELECT COUNT(*) FROM outbox").scalar() == 0
```

Verify the publisher process polls + publishes:

```python
def test_outbox_publisher_publishes_pending():
    # Pre-populate outbox with a pending event
    db.execute("INSERT INTO outbox (event, status) VALUES (?, 'pending')", "OrderPlaced")

    publisher.run_once()

    assert message_broker.published == ["OrderPlaced"]
    assert db.query("SELECT status FROM outbox WHERE event = 'OrderPlaced'").scalar() == "published"
```

## Step 7 — Choreography fan-out test

For choreographed sagas, test that the right services react to the
right events. Use an in-memory event broker:

```python
def test_choreography_fan_out():
    bus = InMemoryEventBus()
    inventory_svc.subscribe(bus, "OrderPlaced")
    payment_svc.subscribe(bus, "OrderPlaced")

    bus.publish(OrderPlaced(order_id="o1", items=[...], amount=100))

    assert inventory_svc.reserved("o1")
    assert payment_svc.charged("o1")
```

For failure paths, publish the failure event + assert
compensating reactions:

```python
def test_choreography_inventory_failure_compensates_payment():
    bus = InMemoryEventBus()
    payment_svc.subscribe(bus, "InventoryReservationFailed")

    # Imagine: payment was already charged optimistically
    payment_svc.charge("o1", 100)

    bus.publish(InventoryReservationFailed(order_id="o1"))

    assert payment_svc.refunds == [("o1", 100)]
```

## Step 8 — Saga timeout test

Sagas can hang (orchestrator waiting for a step that never
responds). Test timeout + escalation:

```python
def test_saga_times_out_when_step_hangs():
    inventory_mock.delay_seconds = 60

    saga = OrderSaga(orchestrator, timeout=5)
    with pytest.raises(SagaTimeout):
        saga.execute(items=[item], amount=100)

    # Compensations should have run
    assert payments_mock.refund_called == 0  # never charged
    assert inventory_mock.release_called == 0  # never confirmed-reserve
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only happy path | Compensation paths untested in prod | Per-step parametrize (Step 4) |
| Compensations that aren't idempotent | Retries cause double-refund | Step 5 idempotency test |
| Skip outbox atomicity test | Order created without event published; downstream blind | Step 6 |
| Choreography test using real broker | Slow + flaky | In-memory event bus for tests (Step 7) |
| No saga timeout | One service hang stalls all sagas | Step 8 |

## Limitations

- Sagas don't provide isolation; test for write-skew anomalies
  separately (`mvcc-isolation-tests`) when concurrent sagas overlap.
- Eventual-consistency window between saga steps may need explicit
  test in user-facing flows.
- Choreography fan-out testing is order-of-magnitude harder than
  orchestration.

## References

- [microservices.io/saga] — orchestration vs choreography, ACD, outbox,
  countermeasures
- [`event-sourcing-tests`](../event-sourcing-tests/SKILL.md) — pairs
  with sagas for event-sourced systems
- [`eventual-consistency-tests`](../eventual-consistency-tests/SKILL.md) —
  isolation-window assertions
- [`mvcc-isolation-tests`](../../qa-concurrency/skills/mvcc-isolation-tests/SKILL.md) —
  per-DB isolation when sagas overlap

[microservices.io/saga]: https://microservices.io/patterns/data/saga.html
