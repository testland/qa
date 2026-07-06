---
name: outbox-pattern-test-author
description: "Authors tests for the transactional outbox pattern: atomic DB-write-plus-event-insert in one transaction, relay/poller publishing with at-least-once delivery and consumer deduplication, insertion-order preservation, idempotent consumers, and relay failure/retry. Use when adding outbox infrastructure, changing the relay or poller, or auditing whether dual-write atomicity and at-least-once delivery guarantees hold under failure."
type: skill
keywords:
  - outbox
  - transactional-outbox
  - polling-publisher
  - dual-write
  - at-least-once
  - idempotency
  - saga
  - event-driven
---

# outbox-pattern-test-author

The transactional outbox is the canonical solution to the dual-write problem:
a service cannot atomically update its database AND publish a message to a
broker in one step without 2PC. Per
[microservices.io/transactional-outbox][tx-outbox], "the service that sends
the message first stores the message in the database as part of the transaction
that updates the business entities. A separate process then sends the messages
to the message broker." This gives the guarantee that "messages are guaranteed
to be sent if and only if the database transaction commits."

`saga-transaction-tests` names outbox atomicity in its Step 6 but contains no
relay, deduplication, ordering, or retry recipes. This skill covers all five
test dimensions end to end.

## When to use

- Introducing or changing the outbox table schema or the relay/poller process.
- Any change to the consumer's dedup logic or idempotency key handling.
- Pre-deployment validation after a relay crash-recovery change.
- Auditing whether an existing saga implementation actually achieves
  dual-write atomicity.

## Step 1 - Map the five test dimensions

Before writing any test, enumerate which dimensions apply:

| Dimension | What to verify |
|---|---|
| **Atomicity** | DB write + outbox insert commit together; partial failure rolls both back |
| **Relay publishing** | Poller picks up pending rows and publishes to the broker |
| **At-least-once + dedup** | Relay may re-publish; consumer deduplicates on message ID |
| **Ordering** | Events published in insertion order per aggregate |
| **Relay retry** | Relay crash/restart re-publishes unpublished rows; no loss |

Each dimension maps to one test group in the sections below.

## Step 2 - Atomicity test

Per [microservices.io/transactional-outbox][tx-outbox], the outbox insert
must be inside the same DB transaction as the business entity update. Test
both the happy path and the mid-transaction failure path:

```python
def test_outbox_insert_commits_with_business_entity(db):
    with db.transaction():
        db.execute("INSERT INTO orders (id, status) VALUES ('o1', 'PLACED')")
        db.execute(
            "INSERT INTO outbox (id, event_type, payload, status) "
            "VALUES ('evt-1', 'OrderPlaced', '{\"order_id\":\"o1\"}', 'PENDING')"
        )

    assert db.scalar("SELECT COUNT(*) FROM orders WHERE id='o1'") == 1
    assert db.scalar("SELECT COUNT(*) FROM outbox WHERE id='evt-1'") == 1


def test_mid_transaction_failure_rolls_back_both(db):
    with pytest.raises(SimulatedDBError):
        with db.transaction():
            db.execute("INSERT INTO orders (id, status) VALUES ('o2', 'PLACED')")
            db.execute(
                "INSERT INTO outbox (id, event_type, payload, status) "
                "VALUES ('evt-2', 'OrderPlaced', '{\"order_id\":\"o2\"}', 'PENDING')"
            )
            raise SimulatedDBError()

    # Both must roll back - this is the guarantee from [tx-outbox]
    assert db.scalar("SELECT COUNT(*) FROM orders WHERE id='o2'") == 0
    assert db.scalar("SELECT COUNT(*) FROM outbox WHERE id='evt-2'") == 0
```

## Step 3 - Relay publishing test

The polling publisher queries the outbox for rows with `status='PENDING'`
and publishes them to the broker. Per
[microservices.io/polling-publisher][poll-pub], the relay works with "any
SQL database" and is the simpler alternative to transaction log tailing.

```python
def test_relay_publishes_pending_events(db, broker, relay):
    db.execute(
        "INSERT INTO outbox (id, event_type, payload, status) "
        "VALUES ('evt-3', 'OrderPlaced', '{\"order_id\":\"o3\"}', 'PENDING')"
    )

    relay.run_once()

    assert broker.published_ids() == ["evt-3"]
    assert db.scalar("SELECT status FROM outbox WHERE id='evt-3'") == "PUBLISHED"


def test_relay_skips_already_published_events(db, broker, relay):
    db.execute(
        "INSERT INTO outbox (id, event_type, payload, status) "
        "VALUES ('evt-4', 'OrderPlaced', '{}', 'PUBLISHED')"
    )

    relay.run_once()

    assert broker.published_ids() == []  # nothing re-sent
```

## Step 4 - At-least-once delivery and consumer deduplication

Per [microservices.io/transactional-outbox][tx-outbox], "the message relay
might publish a message more than once. It might, for example, crash after
publishing a message but before recording the fact that it has done so."
Consumers must therefore be idempotent by tracking processed message IDs.

```python
def test_relay_may_publish_same_event_twice(db, broker, relay):
    # Simulate: relay published but crashed before marking PUBLISHED
    db.execute(
        "INSERT INTO outbox (id, event_type, payload, status) "
        "VALUES ('evt-5', 'OrderPlaced', '{\"order_id\":\"o5\"}', 'PENDING')"
    )
    broker.inject_publish_then_crash_before_ack()

    with contextlib.suppress(RelayRestartedError):
        relay.run_once()

    relay.run_once()  # second pass after restart

    # Broker received it at least once - possibly twice
    assert len(broker.received("evt-5")) >= 1


def test_consumer_deduplicates_duplicate_delivery(consumer, broker):
    event = {"id": "evt-5", "event_type": "OrderPlaced", "payload": {"order_id": "o5"}}

    consumer.handle(event)
    consumer.handle(event)  # duplicate delivery

    # Business effect applied exactly once
    assert consumer.processed_order_count("o5") == 1
    # Both invocations recorded (dedup table has the ID)
    assert consumer.seen_message_id("evt-5") is True
```

The consumer's dedup check must compare the outbox row's `id` column (a
stable, relay-assigned UUID) - not content hashing, which breaks for
non-deterministic payloads.

## Step 5 - Ordering test

Per [microservices.io/transactional-outbox][tx-outbox], "messages must be
sent to the message broker in the order they were sent by the service. This
ordering must be preserved across multiple service instances."
[microservices.io/polling-publisher][poll-pub] notes ordering is "tricky"
for the polling implementation - verify the relay uses `ORDER BY inserted_at
ASC` (or equivalent sequence column) explicitly.

```python
def test_relay_publishes_events_in_insertion_order(db, broker, relay):
    for i in range(1, 4):
        db.execute(
            "INSERT INTO outbox (id, event_type, payload, status, inserted_at) "
            "VALUES (?, 'ItemAdded', '{}', 'PENDING', ?)",
            f"evt-order-{i}",
            datetime.utcnow() + timedelta(milliseconds=i),
        )

    relay.run_once()

    published = broker.published_ids()
    assert published == ["evt-order-1", "evt-order-2", "evt-order-3"]
```

If the relay does not enforce ordering, this test will catch non-deterministic
sequences on high-concurrency inserts.

## Step 6 - Relay failure and retry test

The relay must re-publish any rows still `PENDING` after a crash. This
validates the recovery contract that gives at-least-once semantics:

```python
def test_relay_retries_pending_rows_after_crash(db, broker, relay):
    db.execute(
        "INSERT INTO outbox (id, event_type, payload, status) "
        "VALUES ('evt-retry', 'PaymentCaptured', '{}', 'PENDING')"
    )

    relay.crash_after_n_publishes = 0  # crash before any publish
    with contextlib.suppress(RelayCrashError):
        relay.run_once()

    # Row is still PENDING after crash
    assert db.scalar("SELECT status FROM outbox WHERE id='evt-retry'") == "PENDING"

    relay.crash_after_n_publishes = None  # recover
    relay.run_once()

    assert broker.published_ids() == ["evt-retry"]
    assert db.scalar("SELECT status FROM outbox WHERE id='evt-retry'") == "PUBLISHED"
```

Pair this with the consumer deduplication test (Step 4) - a relay retry
produces a duplicate delivery that the consumer must absorb.

## Anti-patterns

| Anti-pattern | Consequence | Fix |
|---|---|---|
| Outbox insert outside the transaction | Business entity commits; event never published (silent data loss) | Step 2 atomicity test |
| Relay marks PUBLISHED before broker ACK | Crash window loses the event | Step 6 retry test |
| Consumer lacks dedup table | Duplicate delivery causes double-charge, double-refund | Step 4 dedup test |
| Relay polls without `ORDER BY` | Non-deterministic publish order; downstream ordering bugs | Step 5 ordering test |
| Reuse saga-transaction-tests Step 6 only | No relay, dedup, ordering, or retry coverage | All steps above |

## Limitations

- These tests use an in-process relay stub. A separate integration test
  layer is needed to verify the real relay process against a live broker
  (Kafka, RabbitMQ, SNS) - the stub tests the contract, not the transport.
- Transaction log tailing (Debezium-style) is a separate relay
  implementation; the polling tests above apply only to
  [microservices.io/polling-publisher][poll-pub]. Log-tailing introduces
  different ordering and dedup mechanics.
- Outbox table retention policy (purging PUBLISHED rows) is an operational
  concern out of scope here; test relay behavior only against PENDING rows.

## References

- [microservices.io/transactional-outbox][tx-outbox] - pattern definition,
  dual-write problem, at-least-once delivery, deduplication requirement,
  ordering guarantee
- [microservices.io/polling-publisher][poll-pub] - relay query mechanics,
  SQL compatibility, ordering caveat
- [`saga-transaction-tests`](../saga-transaction-tests/SKILL.md) - saga
  orchestration and choreography; pairs with this skill when sagas use the
  outbox for step-event publishing
- [`eventual-consistency-tests`](../eventual-consistency-tests/SKILL.md) -
  assertion of the consistency window between outbox publish and consumer
  processing

[tx-outbox]: https://microservices.io/patterns/data/transactional-outbox.html
[poll-pub]: https://microservices.io/patterns/data/polling-publisher.html
