# Event tests sleep 25 seconds and still fail on a cold CI runner

## Problem Description

`tests/conftest.py` brings up a Kafka broker for the event tests, then waits a
flat 25 seconds before handing the bootstrap address to the tests. On a warm
laptop the broker answers in about four seconds, so every local run throws away
twenty. Nobody runs the event tests locally any more.

On CI it is worse. When the runner pulls the image fresh the broker is sometimes
still not accepting clients when the wait expires, and the first test dies with
`NoBrokersAvailable` - which reads like a product bug and gets triaged as one.
The number has gone 15 -> 25 -> 40 over the last three months. Each bump made the
failure rarer and the suite slower.

We want the fixture to hand out the address when the broker can actually serve a
client, and to fail loudly as a setup failure - not as a mysterious error inside
whichever test happened to run first.

## Output Specification

1. Rework the `broker` fixture in `tests/conftest.py` so it returns only once the
   broker is genuinely able to serve clients, and so that decision is not made by
   elapsed time.
2. A broker that never becomes usable must fail as a setup failure with a bounded
   upper limit and a message naming the broker, not as `NoBrokersAvailable`
   inside a test.
3. A fast machine must not pay a fixed cost - a broker ready in four seconds must
   let the first test start at about four seconds.
4. The fixture keeps its name, its session scope, and its return value (the
   bootstrap-server string). `tests/test_order_events.py` must not be edited.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
import time

import pytest
from testcontainers.kafka import KafkaContainer

STARTUP_SECONDS = 25


@pytest.fixture(scope="session")
def broker():
    container = KafkaContainer("confluentinc/cp-kafka:7.6.0")
    container.start()
    # give the broker time to come up before anyone connects
    time.sleep(STARTUP_SECONDS)
    yield container.get_bootstrap_server()
    container.stop()

=============== FILE: tests/test_order_events.py ===============
import json
import uuid

from kafka import KafkaConsumer, KafkaProducer

from myapp.events import OrderPublisher

TOPIC = "orders"


def test_publishes_an_order_created_event(broker):
    publisher = OrderPublisher(bootstrap_servers=broker)
    order_id = str(uuid.uuid4())

    publisher.order_created(order_id=order_id, customer="ada", total_cents=4200)

    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=broker,
        auto_offset_reset="earliest",
        consumer_timeout_ms=10_000,
    )
    payloads = [json.loads(m.value) for m in consumer]
    assert {"type": "order.created", "id": order_id, "total_cents": 4200} in payloads


def test_publishes_nothing_when_the_order_is_rejected(broker):
    publisher = OrderPublisher(bootstrap_servers=broker)

    publisher.order_rejected(order_id="never-published", reason="fraud")

    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=broker,
        auto_offset_reset="earliest",
        consumer_timeout_ms=5_000,
    )
    ids = [json.loads(m.value)["id"] for m in consumer]
    assert "never-published" not in ids


def test_producer_is_reusable_across_calls(broker):
    producer = KafkaProducer(bootstrap_servers=broker)
    assert producer.bootstrap_connected()
    producer.close()

=============== FILE: pytest.ini ===============
[pytest]
testpaths = tests
addopts = -ra
markers =
    integration: needs a container runtime

=============== FILE: requirements-dev.txt ===============
pytest==8.3.4
kafka-python==2.0.2
testcontainers[kafka]==4.9.0
