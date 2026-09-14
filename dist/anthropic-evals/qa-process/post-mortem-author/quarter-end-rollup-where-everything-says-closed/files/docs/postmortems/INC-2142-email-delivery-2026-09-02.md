# Post-mortem - INC-2142 - transactional email delayed 92 minutes

**Status:** Action items closed
**Severity:** SEV-3
**Authors:** Tomi Okafor
**Date authored:** 2026-09-03   **Incident date:** 2026-09-02
**Reviewers:** R. Kaur (eng manager), S. Iyer (SRE)

## Summary
The email provider degraded from 13:10 to 14:42 UTC. Our sender retried without
backoff, exhausted its connection pool, and transactional email - order
confirmations and password resets - was delayed up to 92 minutes. No email was
lost; the queue drained fully by 15:05.

## Impact
- Users affected: 7,400 delayed messages; 610 password resets delayed over 30 min.
- Revenue: none. No orders failed; confirmations arrived late.
- SLO debt: none - transactional email has no availability SLO.
- 19 support tickets.

## Timeline
| Time (UTC) | Event | Source |
|------------|-------|--------|
| 13:10 | provider 5xx rate rises | provider status page |
| 13:12 | sender connection pool exhausted | application log |
| 13:26 | queue depth alert fires | Datadog |
| 14:42 | provider recovers | provider status page |
| 15:05 | queue fully drained | Datadog |

## Root cause
The sender retries failed deliveries immediately and without a cap. Under
provider degradation the retry volume held every connection in the pool, so new
sends could not acquire one and queued behind the retries.

## Contributing factors
No retry backoff; no cap on in-flight retries; queue depth alert threshold set
above the level at which delivery latency becomes user-visible.

## What went well
Nothing was lost - the queue held everything and drained cleanly. The queue depth
alert fired 16 minutes in, before any customer contact.

## Action items
| ID | Action | Owner | Priority | Due | Success criterion |
|----|--------|-------|----------|-----|-------------------|
| AI-1 | Exponential backoff with a cap on the email sender | Tomi Okafor | P1 | 2026-09-09 | provider-degradation simulation keeps pool utilisation under 60% |
| AI-2 | Lower the queue depth alert to the user-visible threshold | Tomi Okafor | P2 | 2026-09-16 | alert fires within 5 minutes in the same simulation |
| AI-3 | Runbook for email provider degradation | Aisha Brody | P3 | 2026-09-30 | runbook linked from the PagerDuty service, dry-run once |

## Lessons learned
Retry storms consume the same pool the healthy path needs.
