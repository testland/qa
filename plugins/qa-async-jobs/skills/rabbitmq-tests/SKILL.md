---
name: rabbitmq-tests
description: "Tests RabbitMQ producer/consumer interactions - supports AMQP 0.9.1 and AMQP 1.0 protocols across 6 tutorial patterns (Hello World, Work Queues, Publish/Subscribe, Routing, Topics, RPC) plus Publisher Confirms; consumer ack/nack/requeue patterns; durable queues + persistent messages; quorum vs classic queue; tests via Testcontainers RabbitMQ image or LocalStack-equivalent. Use when the user works with RabbitMQ producers/consumers (pika, amqplib, RabbitMQ.Client, spring-amqp) and needs unit/integration tests."
---

# rabbitmq-tests

## Overview

RabbitMQ is the leading OSS AMQP message broker. Per
[rabbitmq.com/tutorials][rmq-tut], the canonical learning path is
six tutorials covering progressively more sophisticated patterns:

[rmq-tut]: https://www.rabbitmq.com/tutorials

| Tutorial | Pattern |
|---|---|
| Hello World! | Single producer → single consumer |
| Work Queues | Producer → multiple competing consumers (round-robin) |
| Publish/Subscribe | Fanout exchange → multiple consumers (broadcast) |
| Routing | Direct exchange with routing keys |
| Topics | Topic exchange with wildcard routing patterns |
| RPC | Request-reply via reply-to + correlation-id |

All six tutorials exist in both AMQP 0.9.1 and AMQP 1.0 variants per
[rmq-tut][rmq-tut]; AMQP 0.9.1 also has a 7th tutorial - Publisher
Confirms - for delivery guarantees.

Per [rmq-tut][rmq-tut]: "Executable versions of these tutorials [are
open source](https://github.com/rabbitmq/rabbitmq-tutorials)."

## When to use

- The repo has RabbitMQ producer / consumer code (pika in Python,
  amqplib in Node.js, RabbitMQ.Client in .NET, spring-amqp in Java).
- The user writes unit tests for the producer/consumer logic.
- The user writes integration tests against a real RabbitMQ broker
  (Docker / Testcontainers).
- A test verifies ack semantics, retry-via-requeue, dead-letter
  exchanges, or publisher confirms.

## Step 1 - Test approach

Three approaches:

| Approach | Pros | Cons |
|---|---|---|
| Mock the AMQP client (pika.BlockingConnection, amqplib Channel) | Fast, no broker dep | Doesn't catch protocol-level behavior (ack races, requeue ordering) |
| Testcontainers RabbitMQ (Docker image per test class) | Full AMQP semantics, isolated | Slower; container startup cost |
| Shared dev RabbitMQ instance | Fast | Test interference; queue cleanup discipline required |

Pick Testcontainers for integration tests; mocking for pure
producer-logic unit tests.

## Step 2 - Testcontainers setup (Python)

```python
from testcontainers.rabbitmq import RabbitMqContainer
import pika

@pytest.fixture(scope="session")
def rabbitmq():
    with RabbitMqContainer("rabbitmq:3-management") as rmq:
        yield rmq

@pytest.fixture
def channel(rabbitmq):
    conn = pika.BlockingConnection(pika.URLParameters(rabbitmq.get_connection_url()))
    ch = conn.channel()
    yield ch
    conn.close()
```

(Testcontainers cleans up the container automatically when the
fixture scope ends.)

## Step 3 - Hello World pattern (basic publish + consume)

Producer side:

```python
def publish_order(channel, order_data):
    channel.queue_declare(queue='orders', durable=True)
    channel.basic_publish(
        exchange='',
        routing_key='orders',
        body=json.dumps(order_data),
        properties=pika.BasicProperties(delivery_mode=2),  # persistent
    )
```

Test:

```python
def test_publish_order(channel):
    publish_order(channel, {"id": 1})

    method, props, body = channel.basic_get(queue='orders', auto_ack=True)
    assert method is not None
    assert json.loads(body) == {"id": 1}
```

## Step 4 - Test consumer ack / nack / requeue

```python
def consume_order(channel):
    method, props, body = channel.basic_get(queue='orders')
    if method is None:
        return None
    try:
        process(body)
        channel.basic_ack(method.delivery_tag)
        return body
    except TransientError:
        channel.basic_nack(method.delivery_tag, requeue=True)   # requeue for retry
        raise
    except PermanentError:
        channel.basic_nack(method.delivery_tag, requeue=False)  # to DLX if configured
        raise
```

Test the requeue path:

```python
def test_consumer_requeues_on_transient_error(channel, mocker):
    channel.queue_declare(queue='orders', durable=True)
    channel.basic_publish(exchange='', routing_key='orders', body='msg-1')

    mocker.patch('proj.consumer.process', side_effect=TransientError)
    with pytest.raises(TransientError):
        consume_order(channel)

    # Message should be back in the queue:
    method, _, body = channel.basic_get(queue='orders', auto_ack=True)
    assert body == b'msg-1'
```

## Step 5 - Test dead-letter exchange (DLX)

```python
channel.exchange_declare(exchange='dlx', exchange_type='direct', durable=True)
channel.queue_declare(queue='orders-dlq', durable=True)
channel.queue_bind(queue='orders-dlq', exchange='dlx', routing_key='orders')

channel.queue_declare(
    queue='orders',
    durable=True,
    arguments={
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'orders',
    },
)
```

After `basic_nack(requeue=False)` or message TTL expiry, the message
routes to `orders-dlq`. Test by consuming from the DLQ.

## Step 6 - Publisher Confirms

Per the AMQP 0.9.1 Publisher Confirms tutorial (per [rmq-tut][rmq-tut]):

```python
channel.confirm_delivery()
try:
    channel.basic_publish(
        exchange='',
        routing_key='orders',
        body='order-1',
        mandatory=True,
        properties=pika.BasicProperties(delivery_mode=2),
    )
    # If the broker can't route or persist, raises pika.exceptions.UnroutableError
    # or NackError. Otherwise the message was confirmed.
except pika.exceptions.UnroutableError:
    raise
```

For tests asserting publisher confirms succeed, simply enable confirm
mode and assert no exception.

## Step 7 - Quorum queue testing

Quorum queues (since RabbitMQ 3.8) replace mirrored classic queues
for HA. Test pattern is identical to classic queues at the API
level; the difference is in `arguments`:

```python
channel.queue_declare(
    queue='orders',
    durable=True,
    arguments={'x-queue-type': 'quorum'},
)
```

Quorum-specific testing (e.g., partition-tolerance) requires
multi-node clusters - Jepsen-style; out of scope for typical
integration tests.

## Step 8 - CI integration

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports: [5672:5672, 15672:15672]
    options: >-
      --health-cmd "rabbitmq-diagnostics ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - run: pytest tests/integration/amqp/ -v
```

The `:management` tag includes the management UI on port 15672 for
debugging in CI logs.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `auto_ack=True` for tests of error paths | Message ack-ed before processing → no requeue test possible | `auto_ack=False` (Step 4) |
| Test publisher without `confirm_delivery()` | Can't assert delivery happened - broker may have dropped the message | Enable confirm mode (Step 6) |
| Skip queue cleanup between tests | Stale messages cause flaky assertions | `queue_purge` or per-test queue names |
| Use `durable=False` on production-mirrored queues in tests | Tests pass; production loses messages on broker restart | Match production queue config in tests |

## Limitations

- AMQP 0.9.1 vs AMQP 1.0 protocol differences - pick one per
  service; tutorials cover both per [rmq-tut][rmq-tut].
- Multi-node cluster behavior (network partitions, leader
  election) is out of scope for typical integration tests; use
  Jepsen for those.
- Stream queues (added 2021) have a different API; not covered
  here.
- pika is the canonical Python client; for asyncio, prefer
  aio-pika.

## References

- [rmq-tut][rmq-tut] - six canonical tutorials (Hello World, Work
  Queues, Publish/Subscribe, Routing, Topics, RPC) + Publisher
  Confirms; covers AMQP 0.9.1 and AMQP 1.0
- github.com/rabbitmq/rabbitmq-tutorials - executable versions of
  the tutorials
- rabbitmq.com/docs - full RabbitMQ documentation
- testcontainers.com/modules/rabbitmq - Testcontainers RabbitMQ
  module
- [`sidekiq-tests`](../sidekiq-tests/SKILL.md),
  [`celery-tests`](../celery-tests/SKILL.md),
  [`bullmq-tests`](../bullmq-tests/SKILL.md),
  [`sqs-tests`](../sqs-tests/SKILL.md) - sister tools (Celery
  often runs on RabbitMQ; the celery-tests skill complements this
  for Python-Celery deployments)
- [`idempotency-test-author`](../idempotency-test-author/SKILL.md) - 
  critical companion: requeue + redelivery semantics need
  idempotent consumers
