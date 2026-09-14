# Incident 2026-06-02 - order fulfilment backlog after callback failures

**Severity:** S1   **Detected:** 11:48 UTC by a support escalation, not by monitoring
**Impact window:** 09:12 - 15:40 UTC   **Orders affected:** 41   **Cancellations:** 3
**Author:** Nils Ostberg   **Reviewed by:** Dov Aarons

## Timeline

- 09:12 - Provider begins returning 503 on callback POSTs.
- 09:12 to 15:40 - Every inbound callback exhausts its three attempts. Exhausted
  events are logged at WARN and handed to the dead-letter queue.
- 11:48 - Support escalates: customers report paid orders showing as pending.
- 13:05 - We go looking for the exhausted events to re-drive them ourselves. The
  dead-letter store comes back empty. Assumed a retention setting; did not chase it
  further during the incident.
- 13:20 - Provider asked to replay the window from their side.
- 15:40 - Provider replay completes and covers 32 of the 41. Support re-keys the
  remaining 9 by hand.

## What we found

This was a provider-side outage. Our own handling worked as designed: retry with
backoff and the dead-letter path both shipped in v4.2 and both ran throughout the
window, and the suite covering them is green on the running release. The events were
not recoverable from our side because the provider holds the source of truth for a
callback once it has been rejected, which is why the replay had to come from them.

Detection was the real gap - no alert fires on exhausted callback attempts, so a
customer told us before our own graphs did.

## Action items

1. Ask the provider for a self-serve replay API so we are not waiting on their
   support queue next time. Owner: Nils. Open.
2. Alert on exhausted callback attempts. Owner: Halim. Open.
3. Reflect the outage in the release register. Owner: Priyanka. Open.
