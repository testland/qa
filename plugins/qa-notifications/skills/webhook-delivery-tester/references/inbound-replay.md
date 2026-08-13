# Inbound capture-and-replay hardening

Deep reference for the receiver side of the SKILL.md: a capture-and-replay
framework that signs fixtures at runtime and drives the receiver through the
attack cases the core Step 4-6 tests don't cover - tampered payloads,
future-dated timestamps, and key rotation. Per the
[Standard Webhooks spec](https://www.standardwebhooks.com/), "every webhook
implementation needs to protect themselves and their users from SSRF,
spoofing, and replay attacks."

## Capture-and-replay framework structure

```
tests/webhook-replay/
├── fixtures/
│   ├── stripe-charge-succeeded.json    # full request body
│   ├── stripe-charge-succeeded.headers.json   # incl. svix-* headers
│   └── github-pr-opened.json
├── replay.py                            # replay loop
└── conftest.py                          # signing helpers
```

## The svix-* header variant

The Standard Webhooks reference implementation (svix) ships the same scheme
under svix-prefixed headers:

| Header | Meaning |
|---|---|
| `svix-id` | Unique webhook identifier |
| `svix-timestamp` | Unix timestamp (seconds) |
| `svix-signature` | `v1,<base64-hmac-sha256>` (one or more, space-separated) |

Signature input: HMAC-SHA256 over `{id}.{timestamp}.{payload}` with the
shared secret as key - identical math to the SKILL.md's `webhook-*` headers.

## Sign fixtures at runtime

Never hard-code timestamps in fixtures - old fixtures fail the replay window.
Sign at test runtime:

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

## Future-timestamp rejection

The SKILL.md Step 5 rejects stale timestamps; clock-skewed *future*
timestamps must also reject:

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

## Tampered-payload rejection

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

## Multi-version signature (key rotation)

`svix-signature` / `webhook-signature` can carry multiple space-separated
`v1,...` values so senders can rotate keys without an outage. The receiver
accepts if any key validates:

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

## Capture from production (responsibly)

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

Replaying captured production payloads is also the fastest outage-retro
tool: was the failure a webhook storm or a real bug?

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip signature test in dev (mock the verifier) | Prod-only signature bug ships | Use the same verifier in test as prod |
| Hard-code timestamps in fixtures | Old fixtures fail windowed-replay protection | Sign at test runtime |
| Commit raw production payloads | PII leak in repo | Sanitize before commit |
| Use single key, no rotation path | Forced re-signing at rotation; outage risk | Multi-key acceptance test |

## Sources

- [Standard Webhooks spec](https://www.standardwebhooks.com/) - signature
  scheme, replay window, idempotency.
