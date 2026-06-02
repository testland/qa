---
name: webhook-replay-tests
description: "Build a webhook replay-test framework - capture incoming webhook payloads + headers, replay against the receiver under test, validate Standard Webhooks signature scheme (svix-id + svix-timestamp + svix-signature, HMAC-SHA256 over `{id}.{timestamp}.{payload}`), idempotency-key dedup, and 5-minute timestamp window enforcement. Cross-ref qa-notifications/webhook-delivery-tester."
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - webhooks
  - standard-webhooks
  - replay-testing
  - signature-verification
  - idempotency
---

# webhook-replay-tests

Per the [Standard Webhooks spec], "every webhook implementation
needs to protect themselves and their users from SSRF, spoofing,
and replay attacks." Replay tests verify the receiver enforces the
signature, the timestamp window, and idempotency-key dedup.

## When to use

- Building or auditing a webhook receiver (Stripe / GitHub /
  Twilio / Slack inbound).
- Pre-merge gate: signature verification works on the canary
  receiver before flipping traffic.
- Outage retro: was the production failure caused by a webhook
  storm or by a real bug? Replay the captured payloads.

## Step 1 - Capture-and-replay framework structure

```
tests/webhook-replay/
├── fixtures/
│   ├── stripe-charge-succeeded.json    # full request body
│   ├── stripe-charge-succeeded.headers.json   # incl. svix-* headers
│   └── github-pr-opened.json
├── replay.py                            # replay loop
└── conftest.py                          # signing helpers
```

## Step 2 - Standard Webhooks signature scheme

Per the [Standard Webhooks spec], required headers:

| Header | Meaning |
|---|---|
| `svix-id` | Unique webhook identifier |
| `svix-timestamp` | Unix timestamp (seconds) |
| `svix-signature` | `v1,<base64-hmac-sha256>` (one or more, space-separated) |

Signature input: HMAC-SHA256 over `{id}.{timestamp}.{payload}` with
the shared secret as key.

## Step 3 - Sign a fixture for replay

```python
import hmac, hashlib, base64, time, json

def sign_webhook(secret_b64: str, msg_id: str, payload: bytes,
                  timestamp: int | None = None) -> dict[str, str]:
    timestamp = timestamp or int(time.time())
    secret = base64.b64decode(secret_b64.removeprefix("whsec_"))
    signed_payload = f"{msg_id}.{timestamp}.".encode() + payload
    sig = base64.b64encode(hmac.new(secret, signed_payload, hashlib.sha256).digest()).decode()
    return {
        "svix-id": msg_id,
        "svix-timestamp": str(timestamp),
        "svix-signature": f"v1,{sig}",
        "Content-Type": "application/json",
    }
```

## Step 4 - Replay valid signed webhook (positive)

```python
import requests
from pathlib import Path

def test_valid_signed_webhook_accepted():
    payload = Path("fixtures/stripe-charge-succeeded.json").read_bytes()
    headers = sign_webhook(
        secret_b64="whsec_<test-secret>",
        msg_id="msg_test_1",
        payload=payload,
    )
    resp = requests.post("http://localhost:8080/webhooks/stripe",
                          data=payload, headers=headers)
    assert resp.status_code == 200
```

## Step 5 - Replay-attack tests (negative)

Per the [Standard Webhooks spec], a 5-minute window prevents replay:

```python
def test_old_timestamp_rejected():
    payload = b'{"event":"x"}'
    old_ts = int(time.time()) - 600  # 10 min ago, > 5 min window
    headers = sign_webhook(
        secret_b64="whsec_<test-secret>",
        msg_id="msg_test_old",
        payload=payload,
        timestamp=old_ts,
    )
    resp = requests.post("http://localhost:8080/webhooks/stripe",
                          data=payload, headers=headers)
    assert resp.status_code in (400, 401)
```

```python
def test_future_timestamp_rejected():
    payload = b'{"event":"x"}'
    future_ts = int(time.time()) + 600
    headers = sign_webhook("whsec_<test-secret>", "msg_test_future",
                            payload, timestamp=future_ts)
    resp = requests.post("http://localhost:8080/webhooks/stripe",
                          data=payload, headers=headers)
    assert resp.status_code in (400, 401)
```

## Step 6 - Tampered-payload test

```python
def test_tampered_payload_rejected():
    payload = b'{"amount":100}'
    headers = sign_webhook("whsec_<test-secret>", "msg_test_tamper", payload)

    # Tamper after signing
    tampered = b'{"amount":1000000}'
    resp = requests.post("http://localhost:8080/webhooks/stripe",
                          data=tampered, headers=headers)
    assert resp.status_code in (400, 401)
```

## Step 7 - Idempotency / dedup test

Per the [Standard Webhooks spec], "idempotency-key behavior" handles
duplicates gracefully. The receiver should treat a second delivery
of the same `svix-id` as a no-op (or a 200 with no side effects).

```python
def test_duplicate_svix_id_does_not_duplicate_side_effect():
    payload = Path("fixtures/stripe-charge-succeeded.json").read_bytes()
    msg_id = "msg_dup_test_1"
    headers = sign_webhook("whsec_<test-secret>", msg_id, payload)

    # Fresh state
    reset_orders_table()

    # Deliver once
    r1 = requests.post("http://localhost:8080/webhooks/stripe",
                       data=payload, headers=headers)
    assert r1.status_code == 200
    orders_after_first = count_orders()

    # Deliver again with same svix-id
    r2 = requests.post("http://localhost:8080/webhooks/stripe",
                       data=payload, headers=headers)
    assert r2.status_code == 200  # accept, no-op
    orders_after_second = count_orders()

    assert orders_after_first == orders_after_second
```

## Step 8 - Multi-version signature test (key rotation)

Per the [Standard Webhooks spec], `svix-signature` can carry
multiple versions/keys (space-separated `v1,...`). Receiver
accepts if any key validates.

```python
def test_accepts_during_key_rotation():
    payload = b'{"event":"x"}'
    msg_id = "msg_rotate_1"
    ts = int(time.time())

    sig_old = compute_sig(secret_b64="whsec_OLD", msg_id=msg_id,
                            payload=payload, timestamp=ts)
    sig_new = compute_sig(secret_b64="whsec_NEW", msg_id=msg_id,
                            payload=payload, timestamp=ts)

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": str(ts),
        "svix-signature": f"v1,{sig_old} v1,{sig_new}",
        "Content-Type": "application/json",
    }
    resp = requests.post("http://localhost:8080/webhooks/stripe",
                          data=payload, headers=headers)
    assert resp.status_code == 200
```

## Step 9 - Capture from production (responsibly)

For captured payloads, sanitize before committing:

```python
def sanitize_capture(payload: dict) -> dict:
    SENSITIVE_KEYS = {"email", "phone", "ssn", "card", "address"}
    def walk(node):
        if isinstance(node, dict):
            return {k: ("***" if k.lower() in SENSITIVE_KEYS else walk(v))
                     for k, v in node.items()}
        if isinstance(node, list):
            return [walk(x) for x in node]
        return node
    return walk(payload)
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip signature test in dev (mock the verifier) | Prod-only signature bug ships | Use the same verifier in test as prod (Step 4) |
| Hard-code timestamps in fixtures | Old fixtures fail Step 5 windowed-replay protection | Sign at test runtime (Step 3) |
| No idempotency test | Duplicate webhook deliveries cause double-charges | Step 7 mandatory |
| Commit raw production payloads | PII leak in repo | Sanitize before commit (Step 9) |
| Use single key, no rotation path | Forced re-signing at rotation; outage risk | Multi-key acceptance (Step 8) |

## Limitations

- Standard Webhooks is an emerging spec; some senders (Stripe,
  GitHub) use proprietary header names. The svix-* / Stripe-Signature
  / X-Hub-Signature-256 schemes share the HMAC-SHA256 pattern but
  differ in headers + signature serialization.
- 5-minute window is the convention; some receivers tighten or
  widen - verify against the spec your sender publishes.
- Replay tests don't catch live-network issues (TLS errors, DNS).
  Pair with `qa-notifications/webhook-delivery-tester` for delivery
  + retry policy tests.

## References

- [Standard Webhooks spec] - signature scheme, replay window,
  idempotency
- [`qa-notifications/webhook-delivery-tester`](../../../qa-notifications/skills/webhook-delivery-tester/SKILL.md) - 
  sister skill for delivery + retry on the sender side
- [`mqtt-tests`](../mqtt-tests/SKILL.md),
  [`websocket-tests`](../websocket-tests/SKILL.md) - alternative
  realtime transports

[Standard Webhooks spec]: https://www.standardwebhooks.com/
