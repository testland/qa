# Incident 2026-06-02 - order fulfilment backlog after callback failures

**Severity:** S1   **Detected:** 11:48 UTC by a support escalation, not by monitoring
**Impact window:** 09:12 - 15:40 UTC   **Orders affected:** 41   **Cancellations:** 3

## Timeline

- 09:12 - Provider begins returning 503 on callback POSTs. Our handler retries.
- 09:12 to 09:14 - Every callback exhausts its three attempts and raises. The events
  are logged at WARN and dropped. Nothing is persisted anywhere.
- 11:48 - Support escalates: customers report paid orders showing as pending.
- 13:05 - Engineering confirms the events are unrecoverable from our side and asks
  the provider to replay.
- 15:40 - Provider replay completes. Remaining 9 orders re-keyed by support.

## What we found

The retry-with-backoff work shipped in v4.2 as described. The dead-letter queue
described alongside it in the same change was specced but never built - there is no
queue, no consumer and no persistence path for an exhausted callback anywhere in
`src/`. Once three attempts fail the event is gone.

No alert fires on exhausted callbacks. Detection was a customer complaint.

## Action items

1. Ask the provider for a replay API we can call ourselves. Owner: Nils. Open.
2. Alert on exhausted callback attempts. Owner: Halim. Open.
3. Reflect this in the risk register. Owner: Priyanka. Open.
