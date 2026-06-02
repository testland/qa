# qa-realtime-protocols

Real-time protocol wire-level testing: not just message round-trips,
but handshakes, control frames, close codes, signature schemes, and
the failure-mode matrix that's invisible until production.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [websocket-tests](skills/websocket-tests/SKILL.md) | S1 | RFC 6455 - handshake (`Sec-WebSocket-Key/Accept`), control frames (ping/pong/close), close codes (1000/1001/1006/1011), subprotocol negotiation, ping/pong keepalive, reconnect-with-jitter, Playwright frame inspection |
| Skill | [server-sent-events-tests](skills/server-sent-events-tests/SKILL.md) | S1 | WHATWG SSE - `EventSource` lifecycle, event-stream format (`data:`/`event:`/`id:`/`retry:`), `Last-Event-ID` reconnect-with-replay, `204` disable-reconnect, HTTP/1.1 connection-pool ceiling |
| Skill | [grpc-streaming-tests](skills/grpc-streaming-tests/SKILL.md) | S1 | gRPC streaming RPCs (Server / Client / Bidi); deadline + cancellation propagation; status code matrix (CANCELLED, DEADLINE_EXCEEDED, INVALID_ARGUMENT, UNAUTHENTICATED, etc.); ghz load test |
| Skill | [mqtt-tests](skills/mqtt-tests/SKILL.md) | S1 | MQTT v5 - QoS 0/1/2 redelivery semantics, retained messages, Last Will and Testament, shared subscriptions (`$share/...`), `$SYS/...` introspection; Mosquitto in CI |
| Skill | [webhook-replay-tests](skills/webhook-replay-tests/SKILL.md) | S3 | Standard Webhooks signature scheme (svix-id + svix-timestamp + svix-signature, HMAC-SHA256), 5-minute replay window, idempotency dedup, multi-key acceptance for rotation |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-realtime-protocols@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
