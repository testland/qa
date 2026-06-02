---
name: mqtt-tests
description: "Test MQTT v5.0 with Mosquitto broker in CI + paho-mqtt clients - QoS 0 / 1 / 2 delivery semantics, retained messages, Last Will and Testament (LWT), shared subscriptions ($share/group/topic), $SYS topic introspection. Critical for IoT, embedded, and M2M systems where wire-level guarantees matter."
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - mqtt
  - mqtt-v5
  - iot
  - mosquitto
  - paho-mqtt
  - realtime-protocols
---

# mqtt-tests

This skill covers the v5.0 surfaces tests must exercise: QoS 0 / 1
/ 2 delivery semantics, retained messages, Last Will and Testament
(LWT), shared subscriptions, and `$SYS` topic introspection - all
per the [MQTT v5.0 spec].

## When to use

- IoT / sensor / M2M product where MQTT is the wire protocol.
- Pre-deploy gate: QoS 1 + 2 redelivery semantics correct,
  retained-message + LWT setup right.
- Smoke test new broker config (auth, ACL, persistence).

## Step 1 - Run Mosquitto broker in CI

```yaml
# GitHub Actions service
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - 1883:1883
    volumes:
      - ./tests/mosquitto.conf:/mosquitto/config/mosquitto.conf
```

`tests/mosquitto.conf`:

```
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
```

## Step 2 - paho-mqtt client setup (Python)

```bash
pip install paho-mqtt
```

```python
import paho.mqtt.client as mqtt

def test_connect_v5():
    client = mqtt.Client(
        client_id="test-1",
        protocol=mqtt.MQTTv5,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    client.connect("localhost", 1883)
    client.loop_start()
    # ... exercise ...
    client.disconnect()
    client.loop_stop()
```

## Step 3 - QoS matrix tests

Per the [MQTT v5.0 spec]:

| QoS | Guarantee | Use |
|---|---|---|
| 0 | At most once (best effort, may be lost) | High-frequency sensor where loss is acceptable |
| 1 | At least once (may duplicate) | Most application messaging |
| 2 | Exactly once (slowest, full PUBREC/PUBREL/PUBCOMP handshake) | Billing, payments, anything dedup-required |

```python
def test_qos1_redelivers_after_disconnect():
    received = []
    sub = mqtt.Client(client_id="sub", protocol=mqtt.MQTTv5,
                       clean_start=False, callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    sub.on_message = lambda c, u, msg: received.append(msg.payload)
    sub.connect("localhost", 1883)
    sub.subscribe("sensors/temp", qos=1)
    sub.loop_start()
    time.sleep(0.5)

    # Disconnect subscriber, publish messages, reconnect
    sub.disconnect()
    sub.loop_stop()

    pub = mqtt.Client(client_id="pub", protocol=mqtt.MQTTv5,
                       callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    pub.connect("localhost", 1883)
    pub.publish("sensors/temp", "22.5", qos=1).wait_for_publish()
    pub.disconnect()

    # Reconnect; broker delivers buffered QoS 1 messages
    sub.reconnect()
    sub.loop_start()
    time.sleep(2.0)
    sub.disconnect()
    sub.loop_stop()

    assert b"22.5" in received
```

`clean_start=False` is required for the broker to retain offline
session state; without it, QoS 1 messages are lost.

## Step 4 - Retained message test

Per the [MQTT v5.0 spec], "servers store and distribute the most
recent message on a topic to new subscribers, enabling state sharing
without republishing."

```python
def test_retained_message_delivered_to_late_subscriber():
    # Publisher sets retain=True
    pub = mqtt.Client(client_id="pub", protocol=mqtt.MQTTv5,
                       callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    pub.connect("localhost", 1883)
    pub.publish("device/status", "online", qos=1, retain=True).wait_for_publish()
    pub.disconnect()

    # New subscriber connects 5s later — still receives retained msg
    time.sleep(5)
    received = []
    sub = mqtt.Client(client_id="sub-late", protocol=mqtt.MQTTv5,
                       callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    sub.on_message = lambda c, u, msg: received.append(msg.payload)
    sub.connect("localhost", 1883)
    sub.subscribe("device/status", qos=1)
    sub.loop_start()
    time.sleep(1)
    sub.disconnect()
    sub.loop_stop()

    assert received == [b"online"]
```

To clear: publish empty payload with `retain=True`.

## Step 5 - Last Will and Testament (LWT)

Per the [MQTT v5.0 spec], "When clients disconnect abnormally,
servers automatically publish predetermined messages to notify other
clients of unavailability."

```python
def test_lwt_published_on_abnormal_disconnect():
    # Subscriber listens for status updates
    received = []
    monitor = mqtt.Client(client_id="monitor", protocol=mqtt.MQTTv5,
                           callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    monitor.on_message = lambda c, u, msg: received.append(msg.payload)
    monitor.connect("localhost", 1883)
    monitor.subscribe("device/+/status", qos=1)
    monitor.loop_start()

    # Device sets LWT then crashes
    device = mqtt.Client(client_id="device-1", protocol=mqtt.MQTTv5,
                          callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    device.will_set("device/1/status", "offline", qos=1, retain=False)
    device.connect("localhost", 1883)
    device.publish("device/1/status", "online", qos=1, retain=True).wait_for_publish()
    # Simulate crash (no clean disconnect)
    device._sock.close()

    time.sleep(3)  # broker keepalive timeout
    monitor.disconnect()
    monitor.loop_stop()

    assert b"offline" in received
```

## Step 6 - Shared subscriptions ($share/...)

Per the [MQTT v5.0 spec], shared subscriptions distribute messages
among group members rather than broadcasting:

```
$share/<groupname>/<topic-filter>
```

```python
def test_shared_subscription_round_robin():
    received_a = []
    received_b = []
    sub_a = mqtt.Client(client_id="sub-a", protocol=mqtt.MQTTv5,
                         callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    sub_b = mqtt.Client(client_id="sub-b", protocol=mqtt.MQTTv5,
                         callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    sub_a.on_message = lambda c, u, msg: received_a.append(msg.payload)
    sub_b.on_message = lambda c, u, msg: received_b.append(msg.payload)

    sub_a.connect("localhost", 1883); sub_a.subscribe("$share/workers/jobs", qos=1); sub_a.loop_start()
    sub_b.connect("localhost", 1883); sub_b.subscribe("$share/workers/jobs", qos=1); sub_b.loop_start()
    time.sleep(0.5)

    pub = mqtt.Client(client_id="pub", protocol=mqtt.MQTTv5,
                       callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    pub.connect("localhost", 1883)
    for i in range(10):
        pub.publish("jobs", f"job-{i}", qos=1).wait_for_publish()
    pub.disconnect()
    time.sleep(1)

    sub_a.disconnect(); sub_a.loop_stop()
    sub_b.disconnect(); sub_b.loop_stop()

    # Each got some, neither got all
    assert 0 < len(received_a) < 10
    assert 0 < len(received_b) < 10
    assert len(received_a) + len(received_b) == 10
```

## Step 7 - $SYS topic introspection

Per the [MQTT v5.0 spec], `$SYS/...` reserved topics provide broker
diagnostics. Useful for monitoring tests:

```python
def test_broker_reports_connected_clients():
    received = []
    monitor = mqtt.Client(client_id="monitor", protocol=mqtt.MQTTv5,
                           callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    monitor.on_message = lambda c, u, msg: received.append((msg.topic, msg.payload))
    monitor.connect("localhost", 1883)
    monitor.subscribe("$SYS/broker/clients/connected", qos=0)
    monitor.loop_start()
    time.sleep(15)  # $SYS update interval default = 10s
    monitor.disconnect()
    monitor.loop_stop()

    assert any(b for _, b in received if int(b) >= 1)
```

`$SYS/...` topic set varies per broker - Mosquitto + EMQX + HiveMQ
each publish slightly different metrics.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only QoS 0 ("works on my machine") | QoS 1/2 redelivery bugs ship | Step 3 covers matrix |
| Use `clean_start=True` then expect persistence | Broker discards session; QoS 1 buffer lost | `clean_start=False` (Step 3) |
| Skip LWT test | Stale "online" status persists when clients crash | Step 5 |
| Hardcode same `client_id` across tests | Broker disconnects existing on connect; flake | Unique `client_id` per test |
| Forget retained-message cleanup | Subsequent test runs see stale state | Publish empty retained payload between tests |

## Limitations

- MQTT v3.1.1 vs v5.0 differs on Will Properties + reason codes;
  pin client + broker version per test.
- Mosquitto auth + ACL are not tested here; enable in a separate
  test suite if security requirements demand.
- Some advanced v5 features (request/response, topic alias) require
  newer paho-mqtt; verify minimum version per the [paho-mqtt
  reference](https://eclipse.dev/paho/index.php?page=clients/python/index.php).

## References

- [MQTT v5.0 spec] - QoS, retained, LWT, shared subscriptions, $SYS
- [`websocket-tests`](../websocket-tests/SKILL.md) - alternative
  for browser-side bidirectional
- [`webhook-replay-tests`](../webhook-replay-tests/SKILL.md) - HTTP
  alternative for at-least-once delivery

[MQTT v5.0 spec]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
