# MQTT LWT, shared subscriptions, and $SYS introspection

Advanced broker behaviors beyond core QoS and retained-message delivery:
Last Will and Testament, shared subscriptions, and `$SYS` diagnostics.

## Last Will and Testament (LWT)

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

## Shared subscriptions ($share/...)

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

## $SYS topic introspection

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

[MQTT v5.0 spec]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
