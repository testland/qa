---
name: webhook-delivery-tester
description: "Use whenever webhooks need tests, on the sending or receiving side: HMAC-SHA256 signatures, retries with backoff and jitter, timestamp replay windows, ordering, dead letters and body encoding per Standard Webhooks, plus replaying captured inbound payloads with tampering and key rotation cases."
---

# webhook-delivery-tester

## Overview

The Standard Webhooks spec ([standardwebhooks.com][stdwh]) formalizes the
signing, retry, and replay patterns most production systems converged on. This
skill covers tests for both sides:

- **Sender** - your service emits webhooks to customers (Stripe-style
  outbound webhook).
- **Receiver** - your service receives webhooks from a vendor
  (handler for Stripe / Twilio / SendGrid / GitHub events).

[stdwh]: https://www.standardwebhooks.com/
[express]: https://expressjs.com/en/5x/api/express/

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

Standard Webhooks rules that a sender's retry loop must follow
([spec][stdwh-spec]):

| Rule | Spec text |
|---|---|
| One id per event | `webhook-id` "remains the same no matter how many times a webhook that has failed is retried" |
| New timestamp per attempt | "Every time an attempt is retried the timestamp of the attempt is updated", so each attempt is re-signed over `{id}.{new timestamp}.{body}` |
| Success | "responded to with a `2xx` status code (status codes 200-299)": 201 and 204 are success too |
| Redirects | "3xx: Failure. Following redirects causes unnecessary load"; do not follow them |
| Schedule | "a retry schedule spanning multiple days, with an exponential backoff", plus "some level of random jitter" |
| Give up | after sustained failure "disable future delivery to the endpoint" (and tell the consumer); on `410 Gone` the sender "should disable the webhook endpoint, and stop sending it messages" |
| Timeout | "between 15 and 30s" per request |

Two common bugs follow from the first two rows: generating a new id on
each retry (receivers can no longer deduplicate) and re-sending the
first attempt's signature (the timestamp goes stale, so receivers with
a 5-minute tolerance reject every retry).

Test the schedule with an injected clock and HTTP client, never with
real sleeps:

```python
class FakeClock:
    def __init__(self): self.now = 1_700_000_000
    def time(self): return self.now
    def sleep(self, s): self.now += s

def test_retries_keep_id_and_resign_each_attempt(fake_http):
    clock = FakeClock()
    fake_http.respond_sequence([503, 503, 302, 204])     # 302 is a failure, 204 a success
    deliver(event, endpoint, clock=clock, http=fake_http, rand=lambda: 0.5)

    attempts = fake_http.requests
    assert len(attempts) == 4
    assert len({a.headers["webhook-id"] for a in attempts}) == 1          # stable id
    stamps = [int(a.headers["webhook-timestamp"]) for a in attempts]
    assert stamps == sorted(stamps) and len(set(stamps)) == 4            # new timestamp each time
    for a in attempts:                                                   # each one verifies
        assert a.headers["webhook-signature"] == sign_webhook(
            SECRET, a.headers["webhook-id"], a.headers["webhook-timestamp"], a.body)
    gaps = [b - a for a, b in zip(stamps, stamps[1:])]
    assert gaps[0] < gaps[1] < gaps[2]                                   # exponential
    assert not fake_http.followed_redirects

def test_410_disables_endpoint(fake_http):
    fake_http.respond_sequence([410])
    deliver(event, endpoint, clock=FakeClock(), http=fake_http)
    assert endpoint.reload().disabled and len(fake_http.requests) == 1

def test_sustained_failure_disables_and_notifies(fake_http, outbox):
    fake_http.always(500)
    deliver(event, endpoint, clock=FakeClock(), http=fake_http)
    assert endpoint.reload().disabled
    assert outbox.contains(kind="endpoint_disabled", endpoint=endpoint.id)
```

Inject the jitter source (`rand`) so the test can pin it. The typical delay schedule is in
[references/vendor-payloads-and-retries.md](references/vendor-payloads-and-retries.md).

[stdwh-spec]: https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md

## Step 4 - Receiver: signature verification

Standard Webhooks signature verification per [stdwh][stdwh]:

1. Reconstruct the to-sign string: `{webhook-id}.{webhook-timestamp}.{payload}`
2. Compute expected signature with the shared secret.
3. Constant-time compare with the `webhook-signature` header value.
4. Reject if mismatch.

Verify over the **raw request bytes**. Parsing the JSON and
serializing it again changes whitespace and key order, so a valid
signature stops matching. In Express, `express.raw()` "parses all
bodies as a `Buffer`" ([express][express]):

```js
app.post('/webhooks/billing', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body.toString('utf8');      // exactly what was signed
  if (!verify(req.headers, payload)) return res.status(400).end();
  // ...
});
```

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
vulnerable. The harder receiver attack cases - tampered payloads,
future-dated timestamps, key rotation, and a capture-and-replay framework
with runtime-signed fixtures - are in
[references/inbound-replay.md](references/inbound-replay.md).

## Step 6 - Receiver: claim the event, acknowledge fast, process later

Webhooks are sent at-least-once, and the spec says to "Use the
`webhook-id` header as an idempotency key" ([spec][stdwh-spec]).
Two receiver bugs defeat that:

- **Check-then-insert.** `SELECT ... WHERE webhook_id = ?` followed
  later by an `INSERT` lets two concurrent deliveries of the same id
  both see "not processed". Claim the id atomically, before any side
  effect, with a unique constraint:

  ```sql
  INSERT INTO webhook_events (webhook_id, received_at, payload)
  VALUES ($1, now(), $2)
  ON CONFLICT (webhook_id) DO NOTHING
  RETURNING webhook_id;      -- no row back: a duplicate, answer 2xx and stop
  ```

- **Slow synchronous handlers.** Senders time out after "between 15
  and 30s" ([spec][stdwh-spec]) and retry. A handler that calls other
  services before answering produces timeouts, then retries, then
  duplicates. Verify the signature, claim the id, enqueue the work
  (same transaction or an outbox), return 2xx, and process from the
  queue with retries of your own.

Tests (cross-ref `idempotency-test-author` in the qa-async-jobs plugin):

```python
def test_concurrent_duplicates_apply_once(client):
    payload, headers = signed("credit.granted", webhook_id="msg_dup", amount=50)
    with ThreadPoolExecutor(2) as pool:
        r1, r2 = pool.map(lambda _: client.post("/webhooks/billing", data=payload, headers=headers), range(2))
    assert {r1.status_code, r2.status_code} == {200}
    drain_queue()
    assert Ledger.balance(account="a1") == 50          # applied once

def test_acknowledges_before_slow_work(client, slow_downstream):
    payload, headers = signed("invoice.paid", webhook_id="msg_fast")
    started = time.monotonic()
    assert client.post("/webhooks/billing", data=payload, headers=headers).status_code == 200
    assert time.monotonic() - started < 1              # downstream not called inline
    assert queue.size() == 1
```

## Step 7 - Per-vendor sample payloads

For receiver tests of specific vendors, use the vendor's official sample
payloads (NOT hand-rolled) - making up payloads risks field-name drift. The
per-vendor documentation links are in
[references/vendor-payloads-and-retries.md](references/vendor-payloads-and-retries.md).

## Step 8 - Ordering: an older event must not overwrite a newer state

The spec makes no ordering promise, and retries reorder deliveries: an
event that failed once arrives after a later one. If each handler
writes the state it carries, a late `subscription.updated (active)`
can overwrite a newer `subscription.canceled`. Guard every state write
with the event's own time or version (or refetch the current state
from the provider instead of trusting the payload):

```sql
UPDATE subscriptions
SET status = $2, status_event_at = $3
WHERE id = $1 AND (status_event_at IS NULL OR status_event_at < $3);
-- 0 rows updated: this event is older than what is stored; record it and skip
```

```python
def test_older_event_after_newer_is_ignored(client):
    send(client, "subscription.canceled", sub="s1", occurred_at=T0 + 60)
    send(client, "subscription.updated", sub="s1", status="active", occurred_at=T0)   # late retry
    drain_queue()
    assert Subscription.get("s1").status == "canceled"
```

Use the time the event happened (a field in the payload, or the
provider's event sequence), not `webhook-timestamp`, which changes on
every retry.

## Step 9 - End-to-end test recipe

For sender:
1. ✅ Payload shape matches spec (Step 1)
2. ✅ Signature correctly computed (Step 2)
3. ✅ Retry with backoff and jitter, same id, re-signed each attempt (Step 3)
4. ✅ Endpoint disabled after sustained failure or 410 (Step 3)

For receiver:
1. ✅ Reject invalid signature (Step 4)
2. ✅ Accept valid signature (Step 4)
3. ✅ Reject stale timestamp (Step 5)
4. ✅ Concurrent duplicate applied once; fast 2xx (Step 6)
5. ✅ Per-vendor sample payload tests (Step 7)
6. ✅ Older event after newer one ignored (Step 8)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip signature verification | Webhooks accept arbitrary attacker payloads | Step 4 negative + positive tests |
| Skip replay-window check | Captured webhook replayable forever | Step 5 |
| Use `==` instead of constant-time compare for signature | Timing-attack vulnerable | `hmac.compare_digest()` |
| Hand-roll vendor sample payloads | Field names drift from real vendor sends | Use vendor's sample (Step 7) |
| Receiver returns 200 before the event is stored | Vendor stops retrying; the event is lost if processing then fails | Claim the id and enqueue durably, then return 2xx (Step 6) |
| Receiver does all the work before answering | Sender times out (15-30 s) and retries; duplicates follow | Verify, claim, enqueue, answer; process from the queue (Step 6) |
| New `webhook-id` per retry, or the first attempt's signature reused | Receivers cannot deduplicate; stale timestamps fail verification | One id per event; re-sign each attempt (Step 3) |
| Verifying the signature over re-serialized JSON | Bytes differ from what was signed | Raw body (`express.raw()`), Step 4 |
| Handlers that write whatever state the event carries | A late retry overwrites newer state | Compare event time or version before writing (Step 8) |

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

- Inbound capture-and-replay hardening (tamper / future-timestamp /
  key-rotation cases, sanitized captures):
  [references/inbound-replay.md](references/inbound-replay.md)
- [stdwh][stdwh] - Standard Webhooks site; the spec text
  ([stdwh-spec][stdwh-spec]): stable `webhook-id`, timestamp per
  attempt, 2xx success, no redirects, backoff with jitter, disabling,
  410, 15-30 s timeout, `webhook-id` as idempotency key.
- [express][express] - `express.raw()` raw-body middleware.
- IETF RFC 2104 - HMAC: Keyed-Hashing for Message Authentication
- stripe.com/docs/webhooks - Stripe webhooks reference (de-facto standard for many patterns)
- docs.github.com/en/webhooks - GitHub webhooks reference
- `idempotency-test-author` - companion: receivers must be idempotent (cross-plugin)
- `mailpit-testing` (email flows in its references),
  `sms-test-author` - sister channels
  (bounce/complaint webhooks + STOP-keyword webhooks reuse these
  patterns)
