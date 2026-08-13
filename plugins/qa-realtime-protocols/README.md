# qa-realtime-protocols

Real-time protocol wire-level testing: not just message round-trips,
but handshakes, control frames, close codes, and the failure-mode
matrix that's invisible until production. gRPC streaming lives in
qa-grpc (grpc-streaming-test-author); webhook testing lives in
qa-notifications (webhook-delivery-tester).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [websocket-tests](skills/websocket-tests/SKILL.md) | RFC 6455 - handshake (`Sec-WebSocket-Key/Accept`), control frames (ping/pong/close), close codes (1000/1001/1006/1011), subprotocol negotiation, ping/pong keepalive, reconnect-with-jitter, Playwright frame inspection |
| Skill | [server-sent-events-tests](skills/server-sent-events-tests/SKILL.md) | WHATWG SSE - `EventSource` lifecycle, event-stream format, `Last-Event-ID` reconnect-with-replay, HTTP/1.1 connection-pool ceiling; k6 load testing in references/sse-load.md |
| Skill | [mqtt-tests](skills/mqtt-tests/SKILL.md) | MQTT v5 - QoS 0/1/2 redelivery semantics, retained messages, LWT, shared subscriptions, `$SYS/...` introspection; Mosquitto in CI; STOMP + AMQP 0-9-1 in references/stomp-amqp.md |
| Agent | [realtime-protocol-reviewer](agents/realtime-protocol-reviewer.md) | Adversarial read-only reviewer of WebSocket / SSE / MQTT / webhook handler diffs - checks close-code handling, reconnect backoff, signature validation, MQTT QoS/Clean Start, and heartbeat/idle-timeout; emits BLOCK/PASS verdict |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-realtime-protocols@testland-qa
```
