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
