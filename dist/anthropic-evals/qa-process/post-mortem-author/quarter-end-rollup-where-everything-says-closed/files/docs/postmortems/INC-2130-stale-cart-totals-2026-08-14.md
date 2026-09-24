# Post-mortem - INC-2130 - stale cart totals after a price change

**Status:** Approved
**Severity:** SEV-2
**Authors:** Mei Lin
**Date authored:** 2026-08-17   **Incident date:** 2026-08-14
**Reviewers:** R. Kaur (eng manager)

## Summary
A pricing update at 09:30 UTC invalidated the pricing cache. The refill fan-out
saturated the pricing service, refills timed out, and carts showed pre-change
prices for 34 minutes. 2,900 orders were placed at the old price.

## Impact
- Users affected: 2,900 completed orders at stale prices, ~$31,000 under-charged.
- SLO debt: 6% of the August availability budget.
- 48 support tickets, mostly from customers who saw the price change at checkout.

## Timeline
| Time (UTC) | Event | Source |
|------------|-------|--------|
| 09:30 | bulk price update publishes 1,100 invalidations | pricing service log |
| 09:31 | pricing service p99 1.2s to 14s | Datadog |
| 09:33 | cart totals serving pre-change prices | support tickets, reproduced |
| 09:41 | INC-2130 declared SEV-2 | PagerDuty |
| 10:04 | invalidations throttled by hand, totals correct | deploy shell history |

## Root cause
The pricing cache uses the same refill path as product detail: on invalidation
every concurrent reader misses and calls the pricing service directly. There is
no single-flight guard anywhere on that shared path and no jitter on the
re-populated entries, so the fan-out is bounded only by reader concurrency.

## Contributing factors
Unguarded refill path shared across cache consumers; bulk invalidation with no
rate limit; no alert on cart-total mismatch.

## What went well
Support noticed and reproduced it before any alert fired.

## Action items
| ID | Action | Owner | Priority | Due | Success criterion |
|----|--------|-------|----------|-----|-------------------|
| AI-1 | Single-flight guard on the shared refill path | Platform | P1 | next sprint | cache refills deduplicated |
| AI-2 | Alert on cart-total mismatch rate | Mei Lin | P2 | 2026-08-28 | alert fires in a staged mismatch test |

## Lessons learned
The refill path is shared; a fix scoped to one key space would not have helped.
