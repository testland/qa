# Cache-stampede mitigation families

The three families named in [stampede.md](stampede.md), in full, per
Wikipedia's cache-stampede article. That file summarises each in one line
and keeps the XFetch formula; this file carries the implementations,
drawbacks, and the XFetch variable table.

## 1. Locking

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

## 2. External recomputation

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

## 3. Probabilistic early expiration (XFetch)

Each requester independently decides - with rising probability
as the value ages - to refresh before formal expiry. Per
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
