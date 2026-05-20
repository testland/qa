---
name: cache-stampede-reference
description: "Pure-reference catalog of cache-stampede (thundering-herd) phenomena and mitigations. Defines the stampede (massively-parallel cache misses on key expiry trigger simultaneous recomputation, often congestion-collapse) and the three canonical mitigation families: locking (one writer recomputes, others wait or serve stale), external recomputation (a separate process refreshes on schedule or near-expiry), and probabilistic early expiration via XFetch (each requester independently decides to refresh with probability rising toward expiry; uses formula `(time() - delta * beta * log(rand(0,1))) >= expiry`). Use when designing cache-refresh strategy or diagnosing a known stampede incident. Composes cache-coherence-patterns-reference + stale-while-revalidate-reference."
rating: 23
d6: 4
archetype: S2
---

# cache-stampede-reference

## Overview

A cache stampede (also "dog-piling," "thundering herd at cache
miss") occurs when a cached value expires under high load —
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

## Symptoms in production

| Signal | Interpretation |
|---|---|
| DB or upstream service latency spikes at cache-key TTL boundaries | Stampede on key expiry |
| Cache hit rate drops near zero, recovers slowly | Stampede causing congestion collapse |
| Periodic load spikes synchronised with cron / scheduled jobs | Multiple processes invalidating + recomputing |
| Recompute-cost-vs-traffic ratio > 0.1 | Hot key — stampede risk |

## The three mitigation families

Per Wikipedia's cache-stampede article:

### 1. Locking

Upon cache miss, processes attempt to acquire a lock for that
key. Only the lock holder recomputes; others either wait, return
"not found," or use a stale value.

```python
def get(key):
    val = cache.get(key)
    if val is not None and not val.stale:
        return val
    if cache.acquire_lock(key, ttl=30):
        try:
            val = recompute(key)
            cache.set(key, val, ttl=300)
            return val
        finally:
            cache.release_lock(key)
    else:
        # Another process is recomputing; serve stale or wait
        return val or wait_then_get(key)
```

**Drawbacks** per Wikipedia: "complex implementation handling
edge cases like process failures and race conditions." Lock
holder crashing → cache empty for the lock TTL.

Mitigation: short-TTL locks with periodic refresh while
recomputing.

### 2. External recomputation

A separate process recomputes the cache periodically or near
expiry, decoupled from the request path. Per Wikipedia:
"triggered when values approach expiration, periodically, or on
cache miss."

```python
# Cron / scheduled job
def refresh_hot_keys():
    for key in HOT_KEYS:
        val = recompute(key)
        cache.set(key, val, ttl=600)
```

**When it fits:** static cache keys ("homepage data," "top-10
products"). Hot keys are knowable in advance. The recompute
schedule overlaps the cache TTL.

**Drawback:** doesn't help with unknown / user-specific hot
keys; needs separate infrastructure.

### 3. Probabilistic early expiration (XFetch)

Each requester independently decides — with rising probability
as the value ages — to refresh before formal expiry. Per
Wikipedia, the canonical formula:

```
if (!value || (time() - delta * beta * log(rand(0,1))) >= expiry)
  recompute_and_cache(key)
else
  return value
```

Where:

| Variable | Meaning |
|---|---|
| `delta` | Time to recompute the value (scales the probability distribution) |
| `beta` | Tuning parameter (default 1; >1 favours earlier refresh) |
| `log(rand(0,1))` | Always negative; magnitude controls the early-refresh probability |
| `time()` | Wall-clock or monotonic time |
| `expiry` | Absolute expiry time stored alongside the value |

The "exponential distribution" of refresh decisions means most
requesters use the cached value; only a few do early refresh.
**Per Wikipedia:** "setting beta=1 works well in practice."

Implementation:

```python
import math, random, time

def get_xfetch(key):
    entry = cache.get(key)  # contains {value, expiry, delta}
    if not entry:
        val, delta = measure_recompute(key)
        expiry = time.time() + 300
        cache.set(key, {"value": val, "expiry": expiry, "delta": delta}, ttl=300)
        return val

    now = time.time()
    rand = max(random.random(), 1e-10)
    if now - entry["delta"] * 1.0 * math.log(rand) >= entry["expiry"]:
        # Early refresh
        val, delta = measure_recompute(key)
        expiry = now + 300
        cache.set(key, {"value": val, "expiry": expiry, "delta": delta}, ttl=300)
        return val
    return entry["value"]
```

The `delta` (recompute cost) is **measured** during refresh and
stored. Expensive-to-recompute values get earlier refresh
attempts.

## Combining strategies

The strongest setups combine:

| Layer | Strategy |
|---|---|
| Cache backend | TTL + stale-while-revalidate per [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md) |
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
| Cache TTL = stale-while-revalidate window | RFC 5861 SWR window depends on `Cache-Control: stale-while-revalidate=N` being separate | See [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md) |
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
- Companion catalogs:
  [`cache-coherence-patterns-reference`](../cache-coherence-patterns-reference/SKILL.md),
  [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md).
- Consumed by:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md),
  [`varnish-test-vtc-syntax`](../varnish-test-vtc-syntax/SKILL.md),
  [`cache-key-collision-detector`](../../agents/cache-key-collision-detector.md).
