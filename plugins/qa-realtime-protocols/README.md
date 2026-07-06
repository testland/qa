# qa-realtime-protocols

Real-time protocol wire-level testing: not just message round-trips,
but handshakes, control frames, close codes, signature schemes, and
the failure-mode matrix that's invisible until production.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [websocket-tests](skills/websocket-tests/SKILL.md) | RFC 6455 - handshake (`Sec-WebSocket-Key/Accept`), control frames (ping/pong/close), close codes (1000/1001/1006/1011), subprotocol negotiation, ping/pong keepalive, reconnect-with-jitter, Playwright frame inspection |
| Skill | [server-sent-events-tests](skills/server-sent-events-tests/SKILL.md) | WHATWG SSE - `EventSource` lifecycle, event-stream format (`data:`/`event:`/`id:`/`retry:`), `Last-Event-ID` reconnect-with-replay, `204` disable-reconnect, HTTP/1.1 connection-pool ceiling |
| Skill | [grpc-streaming-tests](skills/grpc-streaming-tests/SKILL.md) | gRPC streaming RPCs (Server / Client / Bidi); deadline + cancellation propagation; status code matrix (CANCELLED, DEADLINE_EXCEEDED, INVALID_ARGUMENT, UNAUTHENTICATED, etc.); ghz load test |
| Skill | [mqtt-tests](skills/mqtt-tests/SKILL.md) | MQTT v5 - QoS 0/1/2 redelivery semantics, retained messages, Last Will and Testament, shared subscriptions (`$share/...`), `$SYS/...` introspection; Mosquitto in CI |
| Skill | [webhook-replay-tests](skills/webhook-replay-tests/SKILL.md) | Standard Webhooks signature scheme (svix-id + svix-timestamp + svix-signature, HMAC-SHA256), 5-minute replay window, idempotency dedup, multi-key acceptance for rotation |
| Agent | [realtime-protocol-reviewer](agents/realtime-protocol-reviewer.md) | Adversarial read-only reviewer of WebSocket / SSE / MQTT / webhook handler diffs - checks close-code handling, reconnect backoff, signature validation, MQTT QoS/Clean Start, and heartbeat/idle-timeout; emits BLOCK/PASS verdict |
| Skill | [stomp-amqp-tests](skills/stomp-amqp-tests/SKILL.md) | STOMP + AMQP 0-9-1 messaging-protocol testing (Spring/ActiveMQ, RabbitMQ). |
| Skill | [sse-load-test](skills/sse-load-test/SKILL.md) | Load-test SSE endpoints: concurrent-stream capacity and the HTTP/1.1 connection ceiling. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-realtime-protocols@testland-qa
```
