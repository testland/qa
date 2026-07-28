---
name: idempotency-test-author
description: "Build-an-X for idempotency tests in any async/job/API context - idempotency-key handling (per Stripe / AWS prescriptive guidance pattern), retry-safe semantics (exactly-once vs at-least-once vs at-most-once), side-effect commutativity verification, fingerprint-based dedup, idempotency-window tuning. Use when authoring tests for any system where the same input could be processed twice (SQS Standard at-least-once, RabbitMQ requeue, retry-on-error logic, webhook redelivery, browser double-click, mobile-network retry)."
---

# idempotency-test-author

## Overview

Authors idempotency tests for any handler where the same input can be
processed twice. Uses the industry-standard idempotency-key pattern
(client sends a unique key per logical operation; the server records
`key -> response` and returns the cached response on duplicates) plus
commutative-side-effect designs for systems that cannot add keys.
Sources in References.

[aws-idem]: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/

## When to use

- Authoring tests for any handler that mutates state on input.
- Reviewing PRs that add a new POST/PATCH endpoint or job processor.
- The system is on at-least-once delivery (SQS Standard, RabbitMQ
  requeue) - idempotency tests are mandatory, not optional.
- Webhook receivers that must handle vendor-side redelivery.

## Step 1 - Classify delivery semantics

| Semantics | Examples | Test requirement |
|---|---|---|
| Exactly-once | SQS FIFO, Kafka with EOS | Idempotency tests are nice-to-have |
| At-least-once | SQS Standard, RabbitMQ requeue, BullMQ retry, webhook redelivery | **Idempotency tests MANDATORY** |
| At-most-once | UDP, fire-and-forget | Idempotency irrelevant; data-loss tests instead |

Most production systems are at-least-once (or are at-least-once
in failure modes). Default to mandatory tests.

## Step 2 - Idempotency-key pattern

The canonical pattern (per Stripe):

1. Client generates a unique key per logical operation (UUID).
2. Client passes the key with every retry of that operation.
3. Server stores `(key, request_hash, response)` on first request.
4. Server returns the cached response on duplicate keys.

```python
from typing import Tuple

class IdempotentEndpoint:
    def __init__(self, store):
        self.store = store

    def post_charge(self, idempotency_key: str, charge_data: dict) -> Tuple[int, dict]:
        cached = self.store.get(idempotency_key)
        if cached:
            # Duplicate request: return cached response
            return cached["status"], cached["body"]

        # First request: process + store
        result = process_charge(charge_data)
        self.store.set(idempotency_key, {"status": 200, "body": result})
        return 200, result
```

**Test pattern:**

```python
def test_duplicate_idempotency_key_returns_cached_response(endpoint, store):
    key = "client-uuid-123"
    charge = {"amount": 100, "currency": "USD"}

    status1, body1 = endpoint.post_charge(key, charge)
    status2, body2 = endpoint.post_charge(key, charge)

    assert (status1, body1) == (status2, body2)

    # And only one charge was actually executed:
    assert charge_processor.execute.call_count == 1
```

## Step 3 - Hash mismatch on key reuse

If a client reuses an idempotency key with a DIFFERENT body, the
server must reject (per Stripe spec):

```python
def test_idempotency_key_with_different_body_rejected(endpoint):
    key = "client-uuid-456"
    endpoint.post_charge(key, {"amount": 100})

    with pytest.raises(IdempotencyConflictError):
        endpoint.post_charge(key, {"amount": 200})   # same key, different body
```

This catches client bugs (key not properly scoped to one logical
operation).

## Step 4 - Side-effect commutativity for non-key designs

Some systems can't add idempotency keys (legacy webhook receivers,
existing APIs). For these, design idempotent side effects via a
transaction-id / fingerprint with an atomic upsert (`ON CONFLICT DO
NOTHING`), then assert the effect runs once. Full code + test:
[references/idempotency-patterns.md](references/idempotency-patterns.md).

## Step 5 - Idempotency-window tuning

Idempotency keys consume storage; choose a TTL based on the maximum
expected retry window. Common choices:

| System | Recommended TTL |
|---|---|
| Stripe API | 24 hours (per Stripe docs) |
| Internal HTTP retries | 1 hour |
| SQS at-least-once consumers | Match SQS message retention (default 4 days) |
| Webhook receivers | 7 days (vendors retry over multi-day windows) |

**Test pattern:**

```python
def test_idempotency_key_expires(endpoint, freezer):
    freezer.move_to("2026-05-06 00:00:00")
    endpoint.post_charge("key-1", charge)

    freezer.move_to("2026-05-07 00:01:00")   # 24h + 1min later
    # Key has expired; same key now treated as new request:
    endpoint.post_charge("key-1", charge)
    assert charge_processor.execute.call_count == 2
```

## Step 6 - Race-condition test (concurrent duplicate)

The hardest case: two requests with the same idempotency key arrive
simultaneously. Without atomic store + check, both can pass the
"is this duplicate?" check. The implementation must use atomic CAS (DB
unique constraint on `idempotency_key` with `ON CONFLICT DO NOTHING`,
or Redis `SETNX`). Concurrent-duplicate test:
[references/idempotency-patterns.md](references/idempotency-patterns.md).

## Step 7 - End-to-end test recipe per handler

For each at-least-once handler:

1. ✅ Single-request happy path test (baseline)
2. ✅ Duplicate-key test (Step 2)
3. ✅ Different-body-same-key rejection test (Step 3)
4. ✅ TTL expiry test (Step 5)
5. ✅ Concurrent-duplicate race test (Step 6)
6. ✅ For event-driven systems: test that re-delivery from the
   broker (SQS message redelivery, RabbitMQ requeue) doesn't
   double-process

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only the first request | Misses every retry/duplicate scenario | Always include Step 2 + 6 |
| Idempotency check via SELECT-then-INSERT | Race between SELECT and INSERT; concurrent duplicates both pass | Atomic CAS (Step 6) |
| Forget TTL on idempotency-key store | Storage grows unbounded; eventual outage | Set TTL per system (Step 5) |
| Counter-based side effects without txn_id dedup | Idempotency-broken even with idempotency keys above | Refactor to commutative ops (Step 4) |
| Skip concurrent test | Most race conditions only surface under load | Always include Step 6 |

## Limitations

- This is a build-an-X workflow, not a tool wrapper. Tests use the
  application's existing test framework (pytest, JUnit, RSpec, etc.).
- Idempotency-key TTL trades storage for safety; tune per business
  need.
- Some operations are inherently non-idempotent (e.g., "send a
  one-time SMS"); document and accept the risk, or design a
  delivery-receipt protocol.
- Distributed-transaction idempotency is out of scope; see
  `saga-transaction-tests`
  in qa-saga-cqrs.

## References

- [aws-idem][aws-idem] - AWS Prescriptive Guidance on building
  idempotent applications
- stripe.com/docs/api/idempotent_requests - Stripe's idempotency-key
  pattern (the de facto industry standard)
- `sqs-tests` - Standard SQS is
  at-least-once; idempotency tests are mandatory
- `rabbitmq-tests` - requeue +
  redelivery semantics need idempotent consumers
- `cron-job-test-author` - cron
  jobs need idempotency for safe overlap recovery
- `webhook-delivery-tester` (in the qa-notifications plugin) - webhook receivers need idempotency
