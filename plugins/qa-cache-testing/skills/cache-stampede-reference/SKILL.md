---
name: cache-stampede-reference
description: "Pure-reference catalog of cache-stampede (thundering-herd) phenomena and mitigations: parallel misses on key expiry trigger simultaneous recomputation (often congestion-collapse), countered by three families - locking, external recomputation near-expiry, and probabilistic early expiration via XFetch (`(time() - delta * beta * log(rand(0,1))) >= expiry`). Use when designing cache-refresh strategy or diagnosing a stampede incident. This is the single failure-mode pattern; for the broader multi-tier pattern catalog use cache-coherence-patterns-reference, for the stale-while-revalidate / stale-if-error extensions use stale-while-revalidate-reference; a reference consumed by redis-cache-tests, not a runnable test."
---

# cache-stampede-reference

## Overview

A cache stampede (also "dog-piling," "thundering herd at cache
miss") occurs when a cached value expires under high load - 
many requesters simultaneously detect the miss, all recompute,
all write back. Per
[en.wikipedia.org/wiki/Cache_stampede](https://en.wikipedia.org/wiki/Cache_stampede):
"massively parallel computing systems with caching mechanisms
come under a very high load" and "multiple threads of execution
will all attempt to render the content of that page
simultaneously." The pathological state: "congestion collapse,
preventing the resource from being recached and maintaining zero
cache hit rates."

This skill is a **pure reference** consumed by per-tier test
skills.

## When to use

- Designing the refresh policy for a hot cache key.
- Investigating a "site falls over at 3 PM" report (TTL aligned
  with traffic peak).
- PR review of new cache-using code.
- Auditing existing locking / probabilistic logic.

## How to use

1. Flag candidate hot keys: any key whose
   recompute-cost-vs-traffic ratio exceeds 0.1, or whose TTL
   aligns with a traffic peak.
2. Confirm a live stampede against the Symptoms table - latency
   spikes at TTL boundaries, hit rate dropping near zero, or
   cron-synchronised spikes.
3. Choose a mitigation family from
   [references/stampede-mitigations.md](references/stampede-mitigations.md)
   by key knowability: XFetch for unknown / user-specific keys,
   external recompute for known-hot keys, locking as a backstop.
4. For XFetch, measure `delta` (recompute cost) during refresh and
   store it beside `value` and `expiry`; keep `beta=1` unless a
   load test says otherwise.
5. Layer the strategies per Combining strategies so each covers
   the others' gaps.
6. Add the tests in Testable behaviours - especially the
   N-concurrent-on-cold-key load test at production concurrency.
7. Alarm on the cache-miss-rate metric so a silent regression (a
   failed cron, an expired lock) resurfaces the stampede visibly.

## Symptoms in production

| Signal | Interpretation |
|---|---|
| DB or upstream service latency spikes at cache-key TTL boundaries | Stampede on key expiry |
| Cache hit rate drops near zero, recovers slowly | Stampede causing congestion collapse |
| Periodic load spikes synchronised with cron / scheduled jobs | Multiple processes invalidating + recomputing |
| Recompute-cost-vs-traffic ratio > 0.1 | Hot key - stampede risk |

## The three mitigation families

Per Wikipedia's cache-stampede article, three families counter the
herd. Full code, drawbacks, and the XFetch variable table are in
[references/stampede-mitigations.md](references/stampede-mitigations.md).

1. **Locking** - on miss, one process acquires a per-key lock and
   recomputes; others wait, return "not found," or serve stale.
   Risk: lock holder crash leaves the cache empty for the lock
   TTL.
2. **External recomputation** - a separate cron / near-expiry job
   refreshes known-hot keys off the request path. Fits static
   keys; doesn't help unknown or user-specific hot keys.
3. **Probabilistic early expiration (XFetch)** - each reader
   independently refreshes early with rising probability as the
   value ages:

```
if (!value || (time() - delta * beta * log(rand(0,1))) >= expiry)
  recompute_and_cache(key)
else
  return value
```

Per Wikipedia, "setting beta=1 works well in practice."

## Worked example

A homepage aggregate ("top-10 products") is cached under one key
with `ttl=300`. Every afternoon at the traffic peak the key
expires, ~1,200 concurrent requests all miss, all hit the
database, and the hit rate collapses to near zero for ~40 s - the
Symptoms table's "site falls over at 3 PM" row.

The key is known and hot, so external recomputation fits: a cron
job refreshes it every 240 s (inside the 300 s TTL), decoupled
from requests. XFetch is added on read as a backstop for the
seconds around a missed cron run - each reader's
`delta * beta * log(rand(0,1))` term nudges a few readers to
refresh early instead of the whole herd. The load test in
Testable behaviours (N=1000 on a cold key) then asserts the
upstream sees <=5 recomputes, down from ~1,000.

## Combining strategies

The strongest setups combine:

| Layer | Strategy |
|---|---|
| Cache backend | TTL + stale-while-revalidate per `stale-while-revalidate-reference` |
| App logic | XFetch on read for hot keys |
| Operations | External recompute for known-hot keys |
| Safety net | Distributed lock (Redis SET NX EX) as a backstop |

The point of layering: XFetch handles unknown hot keys
gracefully; external recompute handles known hot keys; locks
catch the few that slip through.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Lock holds under contention | N concurrent gets on missing key → 1 recompute, N-1 waits/stale |
| XFetch probability rises near expiry | Statistical test: many runs, fraction refreshing before expiry within target band |
| External recompute fires before TTL | E2E: write source-of-truth → wait → assert cache reflects new value |
| Stampede absent under load | Load test: N=1000 concurrent on cold key → upstream sees ≤N recomputes (target: 1-5) |
| Refresh-cost (`delta`) updated on each refresh | Inspect cached metadata |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| No mitigation at all | Stampede inevitable under traffic | Pick at least one strategy |
| Lock without TTL | Lock holder crash → deadlock | TTL on locks; refresh while recomputing |
| XFetch with `beta` very high (10+) | All requesters refresh constantly | beta=1; tune via load test |
| External recompute without monitoring | Cron job fails silently; stampedes return | Alarm on cache-miss rate spike |
| Cache TTL = stale-while-revalidate window | RFC 5861 SWR window depends on `Cache-Control: stale-while-revalidate=N` being separate | See `stale-while-revalidate-reference` |
| Stampede-mitigation tested only under low load | Pass at 10 RPS; fail at 1000 | Test at production-equivalent concurrency |
| Hot key with `must-revalidate` | Forced re-validation = forced stampede on TTL | Use SWR or grace mode |
| Logging the stampede instead of measuring it | Logs swamped during incident; no recovery signal | Metric on cache-miss rate; alarm |
| Trusting client-side retries to "thin" the herd | Retries can amplify | Server-side rate limit on the recompute path |

## Limitations

- **XFetch assumes exponential distribution is right.** Some
  workloads have bimodal cost; tune `delta` measurement to use
  e.g., p95 not mean.
- **Locking blocks on lock acquisition.** Higher latency than
  XFetch / SWR for clients that wait.
- **External recompute is brittle.** A failed cron run leaves
  the cache cold; needs paired monitoring.
- **Cross-region replication.** Mitigations work per cache node;
  geo-distributed setups need per-region coordination.
- **TTL skew.** Multiple cache nodes with slightly different
  expiry → many node-local stampedes instead of one global.

## References

- Cache stampede definition + XFetch formula:
  [en.wikipedia.org/wiki/Cache_stampede](https://en.wikipedia.org/wiki/Cache_stampede).
- Mitigation implementations:
  [references/stampede-mitigations.md](references/stampede-mitigations.md).
- Companion catalogs:
  `cache-coherence-patterns-reference`,
  `stale-while-revalidate-reference`.
- Consumed by:
  `redis-cache-tests`,
  `cdn-cache-purge-tests`,
  `varnish-test-vtc-syntax`.
