# Post-mortem - INC-2104 - product page cache stampede

**Status:** Action items closed
**Severity:** SEV-2
**Authors:** Dan Whitfield
**Date authored:** 2026-07-11   **Incident date:** 2026-07-09
**Reviewers:** R. Kaur (eng manager), S. Iyer (SRE)

## Summary
A cache entry for the 12 highest-traffic product pages expired simultaneously at
11:04 UTC. Every miss went to origin, origin saturated, and product pages
returned 503 for 19 minutes until the cache was warmed by hand.

## Impact
- Users affected: ~41,000 sessions saw at least one 503 (3.1% of daily sessions).
- Revenue: $18,200 of carts abandoned during the window, not recovered.
- SLO debt: 11% of the July availability budget.
- 22 support tickets.

## Timeline
| Time (UTC) | Event | Source |
|------------|-------|--------|
| 11:04 | 12 product-detail keys expire in the same second | CDN log |
| 11:05 | origin request rate 90/s to 7,400/s | Datadog |
| 11:06 | product pages returning 503 | Datadog, synthetic check |
| 11:09 | INC-2104 declared SEV-2 | PagerDuty |
| 11:23 | cache warmed by hand, error rate falling | deploy shell history |

## Root cause
All 12 keys were written by the same warm-up job at deploy time and therefore
share an expiry second. On expiry every concurrent request for a key misses and
proceeds to origin - there is no single-flight guard and no expiry jitter, so
the refill fan-out is unbounded.

## Contributing factors
Single warm-up job writing every key at once; no jitter on TTL; no single-flight
guard on refill; no alert on origin request rate.

## What went well
The synthetic check caught it 2 minutes in; manual warming was a known runbook step.

## Action items
| ID | Action | Owner | Priority | Due | Success criterion |
|----|--------|-------|----------|-----|-------------------|
| AI-1 | Add TTL jitter and a single-flight guard to product-detail cache refills | Platform | P1 | next sprint | improve cache refill behaviour |
| AI-2 | Integration test reproducing the stampede at 200 concurrent misses | Dan Whitfield | P2 | 2026-07-22 | test in cache_refill_test.go fails before the guard and passes after |
| AI-3 | Dashboard for origin request rate per cache key | SRE | | | better visibility |

## Lessons learned
Simultaneous expiry is a property of how the keys are written, not of the traffic.
