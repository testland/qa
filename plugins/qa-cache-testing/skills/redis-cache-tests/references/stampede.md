# Cache stampede (thundering herd) - phenomena and mitigations

A cache stampede ("dog-piling") occurs when a cached value expires under
high load - many requesters simultaneously detect the miss, all recompute,
all write back. Per
[en.wikipedia.org/wiki/Cache_stampede](https://en.wikipedia.org/wiki/Cache_stampede),
the pathological state is "congestion collapse, preventing the resource
from being recached and maintaining zero cache hit rates."

## Symptoms in production

| Signal | Interpretation |
|---|---|
| DB / upstream latency spikes at cache-key TTL boundaries | Stampede on key expiry |
| Cache hit rate drops near zero, recovers slowly | Congestion collapse |
| Load spikes synchronised with cron / scheduled jobs | Multiple processes invalidating + recomputing |
| Recompute-cost-vs-traffic ratio > 0.1 | Hot key - stampede risk |

## The three mitigation families

Per the Wikipedia article; full code, drawbacks, and the XFetch variable
table are in [stampede-mitigations.md](stampede-mitigations.md).

1. **Locking** - on miss, one process acquires a per-key lock and
   recomputes; others wait, return "not found," or serve stale. Risk:
   lock-holder crash leaves the cache empty for the lock TTL.
2. **External recomputation** - a cron / near-expiry job refreshes
   known-hot keys off the request path. Doesn't help unknown or
   user-specific hot keys.
3. **Probabilistic early expiration (XFetch)** - each reader refreshes
   early with rising probability as the value ages:

```
if (!value || (time() - delta * beta * log(rand(0,1))) >= expiry)
  recompute_and_cache(key)
else
  return value
```

Per Wikipedia, "setting beta=1 works well in practice." Measure `delta`
(recompute cost) during refresh and store it beside `value` and `expiry`.

## Choosing and combining

Choose by key knowability: XFetch for unknown / user-specific keys,
external recompute for known-hot keys, locking as a backstop. The
strongest setups layer them:

| Layer | Strategy |
|---|---|
| Cache backend | TTL + stale-while-revalidate ([stale-while-revalidate.md](stale-while-revalidate.md)) |
| App logic | XFetch on read for hot keys |
| Operations | External recompute for known-hot keys |
| Safety net | Distributed lock (Redis `SET NX EX`) |

## Worked example

A homepage "top-10 products" aggregate under one key with `ttl=300`
expires at the traffic peak; ~1,200 concurrent misses hit the database and
the hit rate collapses for ~40s. The key is known and hot, so external
recomputation fits: a cron refreshes it every 240s, with XFetch on read as
a backstop for a missed cron run. The load test below then asserts the
upstream sees <=5 recomputes, down from ~1,000.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Lock holds under contention | N concurrent gets on a missing key → 1 recompute, N-1 wait/stale |
| XFetch probability rises near expiry | Statistical: fraction refreshing early within target band |
| External recompute fires before TTL | Write source → wait → assert cache reflects new value |
| Stampede absent under load | N=1000 concurrent on cold key → upstream sees 1-5 recomputes |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| No mitigation at all | Stampede inevitable under traffic | Pick at least one family |
| Lock without TTL | Lock-holder crash → deadlock | TTL on locks |
| XFetch with very high `beta` (10+) | Everyone refreshes constantly | beta=1; tune via load test |
| External recompute without monitoring | Failed cron → stampedes return silently | Alarm on cache-miss-rate spike |
| Hot key with `must-revalidate` | Forced revalidation = forced stampede at TTL | SWR or grace mode |
| Mitigation tested only at low load | Passes at 10 RPS, fails at 1000 | Production-equivalent concurrency |

## Limitations

- XFetch assumes exponentially distributed recompute cost; bimodal
  workloads should tune `delta` to p95, not mean.
- Mitigations work per cache node; geo-distributed setups need per-region
  coordination, and TTL skew across nodes yields many node-local
  stampedes.

## References

- Cache stampede + XFetch formula:
  [en.wikipedia.org/wiki/Cache_stampede](https://en.wikipedia.org/wiki/Cache_stampede)
- Mitigation implementations: [stampede-mitigations.md](stampede-mitigations.md)
