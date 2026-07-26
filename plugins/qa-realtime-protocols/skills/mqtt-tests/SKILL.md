---
name: mqtt-tests
description: "Test MQTT v5.0 with Mosquitto broker in CI + paho-mqtt clients - QoS 0 / 1 / 2 delivery semantics, retained messages, Last Will and Testament (LWT), shared subscriptions ($share/group/topic), $SYS topic introspection. Critical for IoT, embedded, and M2M systems where wire-level guarantees matter. Use when a product speaks MQTT on the wire and QoS 1 / 2 redelivery, retained-message state, or LWT behavior needs a broker-backed test - including smoke-testing a new broker auth / ACL / persistence config."
metadata:
  keywords: "mqtt, mqtt-v5, iot, mosquitto, paho-mqtt, realtime-protocols"
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

## How to use

1. Stand up an `eclipse-mosquitto:2` broker as a CI service on port 1883 with a persistence-enabled config (Step 1).
2. Wire a paho-mqtt v5 client with `callback_api_version=VERSION2` (Step 2).
3. Exercise the QoS matrix - assert QoS 1 redelivers buffered messages to a reconnecting `clean_start=False` session (Step 3).
4. Verify a retained message reaches a late subscriber, then clear it with an empty retained payload (Step 4).
5. Cover the advanced broker behaviors - LWT on abnormal disconnect, shared-subscription round-robin, and `$SYS` diagnostics ([references/lwt-shared-subs-sys.md](references/lwt-shared-subs-sys.md)).
6. Use a unique `client_id` per test and clean up retained state between runs (Anti-patterns).

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

    # New subscriber connects 5s later - still receives retained msg
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

## LWT, shared subscriptions, and $SYS introspection

See [references/lwt-shared-subs-sys.md](references/lwt-shared-subs-sys.md)
for Last Will and Testament on abnormal disconnect, shared-subscription
round-robin (`$share/<group>/<topic>`), and `$SYS` broker-diagnostics
tests.

## Worked example

A sensor gateway publishes temperature to `sensors/temp` at QoS 1. QA
needs to confirm a subscriber that drops offline still receives messages
published during the outage.

1. Connect a subscriber with `clean_start=False` and subscribe to `sensors/temp` at QoS 1 (Step 3).
2. Disconnect the subscriber to simulate an outage.
3. From a separate publisher, `publish("sensors/temp", "22.5", qos=1).wait_for_publish()`.
4. Reconnect the subscriber with `reconnect()` and pump the loop for ~2s.
5. Assert `b"22.5" in received` - the broker delivered the buffered QoS 1 message on reconnect.

Result: offline-session persistence is verified end to end. Had the test
used `clean_start=True`, the broker would have discarded the session and
the message would have been lost - the exact regression this test guards.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only QoS 0 ("works on my machine") | QoS 1/2 redelivery bugs ship | Step 3 covers matrix |
| Use `clean_start=True` then expect persistence | Broker discards session; QoS 1 buffer lost | `clean_start=False` (Step 3) |
| Skip LWT test | Stale "online" status persists when clients crash | LWT reference |
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
- `websocket-tests` - alternative
  for browser-side bidirectional
- `webhook-replay-tests` - HTTP
  alternative for at-least-once delivery

[MQTT v5.0 spec]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
