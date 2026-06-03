---
name: webhook-delivery-tester
description: "Build-an-X for webhook delivery + receiver tests per Standard Webhooks (standardwebhooks.com) - HMAC-SHA256 signature verification, retry semantics with exponential backoff + jitter, replay-window check via timestamp tolerance, ordering guarantees, dead-letter handling for permanent failures, content-type + body-encoding fidelity. Use when authoring tests for webhook senders OR receivers in any system (Stripe / Twilio / SendGrid / GitHub / GitLab outbound webhooks; SaaS app inbound webhooks)."
rating: 23
d6: 4
---

# webhook-delivery-tester

## Overview

Webhooks are HTTP POSTs from one service to another, signaling
events. Almost every SaaS exposes them; almost no team tests them
properly. The Standard Webhooks spec ([standardwebhooks.com][stdwh])
formalizes the patterns most production systems converged on.

[stdwh]: https://www.standardwebhooks.com/

This skill covers tests for both sides:

- **Sender** - your service emits webhooks to customers (Stripe-style
  outbound webhook).
- **Receiver** - your service receives webhooks from a vendor
  (handler for Stripe / Twilio / SendGrid / GitHub events).

## When to use

- The repo emits or receives webhooks.
- A regression suite needs to verify signature handling, retry
  semantics, replay-window enforcement.
- Compliance review (SOC 2, security audit) requires evidence of
  signature verification.
- The team adopts Standard Webhooks per [stdwh][stdwh].

## Step 1 - Sender vs receiver test patterns

| Test side | Layer | Tools |
|---|---|---|
| Sender - payload shape | Unit | Mock HTTP client; assert POST body |
| Sender - signing | Unit | Verify HMAC matches expected per Standard Webhooks |
| Sender - retries | Integration | Mock server returning 5xx, assert retry+backoff |
| Receiver - signature verify | Unit | Construct signed payload; assert handler accepts/rejects |
| Receiver - replay defense | Unit | Construct payload with stale timestamp; assert rejected |
| Receiver - handler logic | Unit | Per-event-type handler tests with vendor sample payloads |

## Step 2 - Sender: signature signing

Per Standard Webhooks ([stdwh][stdwh]) the canonical signature
scheme:

```
signature = HMAC-SHA256(secret, "{webhook_id}.{timestamp}.{payload}")
```

The signature accompanies the payload via the `webhook-signature`
header (with `v1,` prefix for the version):

```
webhook-id: msg_2KkD9ApUQYKLn9ouQOFKjC
webhook-timestamp: 1714838400
webhook-signature: v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=
```

**Sender-side test:**

```python
import hmac, hashlib, base64

def sign_webhook(secret, webhook_id, timestamp, payload):
    to_sign = f"{webhook_id}.{timestamp}.{payload}".encode()
    sig = hmac.new(
        base64.b64decode(secret),
        to_sign,
        hashlib.sha256,
    ).digest()
    return f"v1,{base64.b64encode(sig).decode()}"

def test_outbound_webhook_signed_correctly():
    payload = '{"type":"order.created","data":{"id":123}}'
    webhook_id = "msg_test"
    timestamp = "1714838400"
    expected_sig = sign_webhook(SECRET, webhook_id, timestamp, payload)

    sent_request = capture_outbound_webhook()
    assert sent_request["headers"]["webhook-id"] == webhook_id
    assert sent_request["headers"]["webhook-timestamp"] == timestamp
    assert sent_request["headers"]["webhook-signature"] == expected_sig
```

## Step 3 - Sender: retry semantics

Per [stdwh][stdwh] the canonical retry pattern: exponential backoff
with jitter, capped at N attempts, then dead-letter.

Typical schedule:

| Attempt | Delay |
|---|---|
| 1 | immediate |
| 2 | 5s |
| 3 | 5min |
| 4 | 30min |
| 5 | 2h |
| 6 | 5h |
| 7 | 10h |
| 8 | (give up; dead-letter) |

**Sender-side test:**

```python
def test_webhook_retries_on_5xx(mock_receiver):
    mock_receiver.return_status(503)   # first 3 attempts fail
    mock_receiver.return_status_after_n(4, 200)   # 4th succeeds

    send_webhook(...)

    # Assert delivery succeeded after retries
    assert mock_receiver.attempt_count == 4
    # Assert backoff between attempts (mock can record timestamps)
    deltas = mock_receiver.attempt_deltas()
    assert deltas[1] >= 5   # at least 5s between attempt 1 and 2
    assert deltas[2] >= 5 * 60   # 5 min between 2 and 3
```

For dead-letter: assert that after max attempts, the webhook is
recorded in a dead-letter store + not retried.

## Step 4 - Receiver: signature verification

The receiver's first line of defense. Standard Webhooks signature
verification per [stdwh][stdwh]:

1. Reconstruct the to-sign string: `{webhook-id}.{webhook-timestamp}.{payload}`
2. Compute expected signature with the shared secret.
3. Constant-time compare with the `webhook-signature` header value.
4. Reject if mismatch.

**Receiver-side test:**

```python
def test_receiver_rejects_invalid_signature(client):
    response = client.post(
        "/webhooks/orders",
        headers={
            "webhook-id": "msg_1",
            "webhook-timestamp": str(int(time.time())),
            "webhook-signature": "v1,deliberately-wrong",
        },
        data='{"type":"order.created"}',
    )
    assert response.status_code == 400

def test_receiver_accepts_valid_signature(client):
    payload = '{"type":"order.created"}'
    timestamp = str(int(time.time()))
    sig = sign_webhook(SECRET, "msg_1", timestamp, payload)

    response = client.post(
        "/webhooks/orders",
        headers={
            "webhook-id": "msg_1",
            "webhook-timestamp": timestamp,
            "webhook-signature": sig,
        },
        data=payload,
    )
    assert response.status_code == 200
```

## Step 5 - Receiver: replay-window defense

A captured signed payload should NOT be re-replayable indefinitely.
Per [stdwh][stdwh] the receiver should reject payloads with
timestamps outside a short window (typically 5 minutes).

```python
def test_receiver_rejects_stale_timestamp(client):
    stale_timestamp = str(int(time.time()) - 600)   # 10 min ago
    payload = '{"type":"order.created"}'
    sig = sign_webhook(SECRET, "msg_1", stale_timestamp, payload)

    response = client.post(
        "/webhooks/orders",
        headers={
            "webhook-id": "msg_1",
            "webhook-timestamp": stale_timestamp,
            "webhook-signature": sig,
        },
        data=payload,
    )
    assert response.status_code == 400
```

If receiver doesn't enforce this, mark **critical**: replay
vulnerable.

## Step 6 - Receiver: idempotent processing

Webhooks are sent at-least-once (vendor retries on 5xx); receiver
must be idempotent. Cross-ref [`idempotency-test-author`](../../qa-async-jobs/skills/idempotency-test-author/SKILL.md):

```python
def test_receiver_idempotent_via_webhook_id(client):
    payload = '{"type":"order.created","data":{"id":123}}'
    webhook_id = "msg_unique"
    sig, ts = sign_for_now(payload, webhook_id)

    # Send twice (simulating vendor redelivery)
    response1 = client.post("/webhooks/orders", headers=..., data=payload)
    response2 = client.post("/webhooks/orders", headers=..., data=payload)

    assert response1.status_code == 200
    assert response2.status_code == 200   # both OK, but only one side-effect
    assert Order.objects.filter(external_id=123).count() == 1
```

## Step 7 - Per-vendor sample payloads

For receiver tests of specific vendors, use the vendor's official
sample payloads (NOT hand-rolled). Vendor docs:

- Stripe: stripe.com/docs/webhooks → "Sample events"
- Twilio: twilio.com/docs/usage/webhooks → per-resource event docs
- SendGrid: docs.sendgrid.com/for-developers/tracking-events
- GitHub: docs.github.com/en/webhooks → per-event payload reference
- GitLab: docs.gitlab.com/ee/user/project/integrations/webhook_events.html

Test fixtures should be copy-pasted from the vendor docs (or
captured from their webhook tester); making up payloads risks
field-name drift.

## Step 8 - Ordering guarantees

Webhooks are typically NOT ordered (concurrent retries → out-of-order
delivery). If your handler relies on order (e.g., processing
`order.created` before `order.updated`), tests should:

```python
def test_handler_handles_out_of_order_events(client):
    # Send "updated" event BEFORE "created"
    send_webhook(client, type="order.updated", id=123, status="shipped")
    send_webhook(client, type="order.created", id=123, status="placed")

    # Handler should reconcile via fetch-from-vendor + apply latest state
    order = Order.objects.get(external_id=123)
    assert order.status == "shipped"   # latest wins
```

If your handler can't survive out-of-order, mark **critical** - 
production will encounter this.

## Step 9 - End-to-end test recipe

For sender:
1. ✅ Payload shape matches spec (Step 1)
2. ✅ Signature correctly computed (Step 2)
3. ✅ Retry on 5xx with backoff (Step 3)
4. ✅ Dead-letter after max attempts (Step 3)

For receiver:
1. ✅ Reject invalid signature (Step 4)
2. ✅ Accept valid signature (Step 4)
3. ✅ Reject stale timestamp (Step 5)
4. ✅ Idempotent processing on retry (Step 6)
5. ✅ Per-vendor sample payload tests (Step 7)
6. ✅ Out-of-order handling if applicable (Step 8)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip signature verification | Webhooks accept arbitrary attacker payloads | Step 4 negative + positive tests |
| Skip replay-window check | Captured webhook replayable forever | Step 5 |
| Use `==` instead of constant-time compare for signature | Timing-attack vulnerable | `hmac.compare_digest()` |
| Hand-roll vendor sample payloads | Field names drift from real vendor sends | Use vendor's sample (Step 7) |
| Receiver returns 200 before processing | Vendor stops retrying; data lost on processing failure | Process synchronously OR queue + return 200 + handle failures via internal queue with idempotency |

## Limitations

- This is a build-an-X workflow. Tests use the application's HTTP
  server + an HMAC library.
- Standard Webhooks adoption varies - many vendors use legacy
  signature schemes (`X-Hub-Signature` from GitHub, `Stripe-Signature`
  from Stripe). Adapt the verification logic per vendor; the
  workflow is the same.
- Signature secret rotation is out of scope; pair with a
  secrets-management workflow.
- For vendors that don't sign (legacy / cheap webhooks),
  IP-allowlisting is the only protection; not addressed here.

## References

- [stdwh][stdwh] - Standard Webhooks specification
- IETF RFC 2104 - HMAC: Keyed-Hashing for Message Authentication
- stripe.com/docs/webhooks - Stripe webhooks reference (de-facto standard for many patterns)
- docs.github.com/en/webhooks - GitHub webhooks reference
- [`idempotency-test-author`](../../qa-async-jobs/skills/idempotency-test-author/SKILL.md) - companion: receivers must be idempotent (cross-plugin)
- [`email-flow-test-author`](../email-flow-test-author/SKILL.md),
  [`sms-test-author`](../sms-test-author/SKILL.md) - sister channels
  (bounce/complaint webhooks + STOP-keyword webhooks reuse these
  patterns)
