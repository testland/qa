---
name: redis-cache-tests
description: "Wraps Redis cache testing: EXPIRE / PEXPIRE / TTL verification (Redis 7+ NX/XX/GT/LT flags), cache-aside write-then-invalidate (write source → DEL key → assert fresh read), eviction under memory pressure (maxmemory + allkeys-lru), pub/sub invalidation across nodes, and tenant key-namespacing. Use when Redis is the app's primary cache. For a Memcached app-tier store use memcached-tests; for the browser/HTTP tier use browser-cache-control-tests; a runnable test, not the cache-stampede-reference or cache-coherence-patterns-reference catalogs."
---

# redis-cache-tests

## Overview

Redis is the dominant application-tier cache. Per
[redis.io/docs/latest/commands/expire/](https://redis.io/docs/latest/commands/expire/),
keys get TTLs via `EXPIRE`, `PEXPIRE`, or `EXPIREAT` - with
Redis 7+ flags `NX` / `XX` / `GT` / `LT` controlling conditional
expiry.

This skill wraps test patterns against a real Redis instance
(via testcontainers or a dedicated test cluster) - **not** a
mock. Mocks lose the eviction-policy + TTL-tick + pub-sub
behaviours that real bugs hide in.

## When to use

- Tests for code that uses Redis as a cache.
- Verifying eviction policy under memory pressure.
- Tenant-namespace tests for cache-key isolation.
- Stampede-mitigation tests per
  `cache-stampede-reference`.

## Authoring

### Install

```bash
pip install redis testcontainers      # Python
npm install --save-dev ioredis testcontainers     # Node
```

### Real-Redis test fixture (Python)

```python
import pytest
import redis
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def redis_url():
    with RedisContainer("redis:7-alpine") as r:
        yield r.get_connection_url()

@pytest.fixture
def r(redis_url):
    client = redis.from_url(redis_url, decode_responses=True)
    yield client
    client.flushdb()  # Reset between tests
```

### Basic TTL tests

Per [redis.io](https://redis.io/docs/latest/commands/expire/):

```python
def test_expire_sets_ttl(r):
    r.set("k", "v")
    assert r.expire("k", 60) == 1
    ttl = r.ttl("k")
    assert 58 <= ttl <= 60

def test_ttl_minus_2_when_key_absent(r):
    assert r.ttl("nonexistent") == -2  # per redis docs

def test_ttl_minus_1_when_no_expiry(r):
    r.set("k", "v")
    assert r.ttl("k") == -1  # exists, no TTL

def test_set_clears_existing_ttl(r):
    r.set("k", "v", ex=60)
    assert r.ttl("k") > 0
    r.set("k", "v2")  # overwrite clears TTL per redis docs
    assert r.ttl("k") == -1
```

### Conditional expire (NX / XX / GT / LT)

```python
def test_expire_nx_only_when_no_ttl(r):
    r.set("k", "v")
    assert r.expire("k", 60, nx=True) == 1
    assert r.expire("k", 120, nx=True) == 0  # already has TTL
    assert r.ttl("k") <= 60

def test_expire_gt_only_extends(r):
    r.set("k", "v", ex=60)
    assert r.expire("k", 120, gt=True) == 1   # 120 > 60
    assert r.expire("k", 30, gt=True) == 0    # 30 < 120
```

### Cache-aside write-then-invalidate

Per `cache-coherence-patterns-reference`
cache-aside pattern:

```python
def test_write_invalidates_cache(r, db):
    db.users.insert({"id": "u1", "name": "alice"})
    r.set("user:u1", '{"id":"u1","name":"alice"}', ex=300)

    # Update via the app's write path
    update_user_via_app("u1", name="bob")  # must DEL cache

    cached = r.get("user:u1")
    assert cached is None, "App should have invalidated cache on write"
```

### Eviction-policy tests

Under memory pressure with `maxmemory-policy allkeys-lru`:

```python
def test_lru_evicts_oldest_under_pressure(r):
    r.config_set("maxmemory", "1mb")
    r.config_set("maxmemory-policy", "allkeys-lru")

    big_value = "x" * 100_000  # 100 KB

    # Fill cache
    for i in range(20):
        r.set(f"key:{i}", big_value)

    # Touch key:0 to make it recently-used
    r.get("key:0")

    # Add more → should evict middle keys, not key:0
    for i in range(20, 30):
        r.set(f"key:{i}", big_value)

    assert r.exists("key:0")              # Recently touched → kept
    assert not r.exists("key:5")          # Not touched → evicted
```

### Cache stampede mitigation

Per `cache-stampede-reference`:

```python
import concurrent.futures, threading

def test_lock_prevents_stampede(r):
    call_count = threading.Lock()
    counter = [0]

    def recompute_once():
        with call_count: counter[0] += 1
        return "computed"

    def cached_get(key):
        val = r.get(key)
        if val: return val
        lock_acquired = r.set(f"lock:{key}", "1", nx=True, ex=30)
        if lock_acquired:
            val = recompute_once()
            r.set(key, val, ex=300)
            r.delete(f"lock:{key}")
            return val
        # Wait for the lock holder (simplified)
        for _ in range(50):
            val = r.get(key)
            if val: return val
            __import__("time").sleep(0.01)
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as ex:
        results = list(ex.map(lambda _: cached_get("hot"), range(100)))

    assert counter[0] == 1, f"Stampede: recomputed {counter[0]} times"
    assert all(r == "computed" for r in results)
```

### Tenant-namespacing tests

Per
`cross-tenant-data-leak-tests`
Test 10:

```python
def test_tenant_namespaced_keys(r, cache):
    cache.set("user:1", "tenant_a_data", tenant_id="A")
    cache.set("user:1", "tenant_b_data", tenant_id="B")

    # Real Redis state should have separate keys
    assert r.get("tenant:A:user:1") == "tenant_a_data"
    assert r.get("tenant:B:user:1") == "tenant_b_data"

    # The application-layer get must respect tenant
    assert cache.get("user:1", tenant_id="A") == "tenant_a_data"
    assert cache.get("user:1", tenant_id="B") == "tenant_b_data"
```

## Running

```bash
pytest tests/redis/ -v
```

testcontainers boots Redis per session; per-test `flushdb`
resets state.

### Pub-sub invalidation across nodes

For multi-node cache invalidation (e.g., Redis Sentinel or a
pub-sub fan-out):

```python
def test_pubsub_invalidation(r):
    pubsub = r.pubsub()
    pubsub.subscribe("invalidate")

    r.set("k", "v", ex=300)
    r.publish("invalidate", "k")

    msg = next(m for m in pubsub.listen() if m["type"] == "message")
    assert msg["data"] == "k"
    # Other nodes would now `r.delete(msg['data'])`
```

## Parsing results

Redis returns simple types: int (1/0 success codes), string
(the value), or `None` (key absent). Assertions are direct.

For TTL: positive int = remaining seconds, `-1` = no TTL,
`-2` = key absent (per redis.io docs).

## CI integration

```yaml
jobs:
  redis-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping" --health-interval 10s
        ports: [6379]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install -e ".[test]"
      - run: pytest tests/redis/ --tb=short
        env:
          REDIS_URL: redis://localhost:6379
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mocking the Redis client | Misses TTL-tick, eviction, pub-sub | Use testcontainers / real Redis |
| Hardcoded test sleep `time.sleep(60)` to test TTL | Slow + flaky | Set tiny TTL (ms via `pexpire`) |
| Asserting on exact TTL value | Race vs Redis tick | Range assertion (e.g., `58 <= ttl <= 60`) |
| Tests don't `FLUSHDB` between | Cross-test pollution | Per-test or per-class flush |
| `SET k v EX 0` | Immediate deletion per redis docs | Use positive TTL or `PERSIST` |
| Cache-aside without explicit invalidation test | Logic bug merged | Cover write → cache-state |
| Tests skip eviction-policy | Memory-pressure bugs hide | Test `maxmemory` + policy explicitly |
| `KEYS *` in test setup | O(N) blocks Redis; flakes under parallel test load | `SCAN` or per-test isolated DB |

## Limitations

- **testcontainers startup adds ~3s per test session.** Use
  `scope="session"` fixtures.
- **Doesn't catch network partitions.** Failover behaviour
  (Sentinel, Cluster) needs toxiproxy or chaos testing.
- **Single-key TTL doesn't compose to multi-key transactions.**
  `MULTI`/`EXEC` semantics need their own tests.
- **Eviction is approximate.** Redis LRU is sampled; the test
  needs tolerant assertions.
- **Doesn't replace contract tests** between the app and Redis
  protocol; protocol drift is rare but possible.

## References

- Redis EXPIRE / TTL / PEXPIRE:
  [redis.io/docs/latest/commands/expire/](https://redis.io/docs/latest/commands/expire/).
- testcontainers Redis module:
  [testcontainers-python.readthedocs.io](https://testcontainers-python.readthedocs.io/).
- Companion catalogs:
  `cache-coherence-patterns-reference`,
  `cache-stampede-reference`.
- Tenant cache leaks:
  `cross-tenant-data-leak-tests`
  Test 10.
- Sibling tools:
  `cdn-cache-purge-tests`,
  `varnish-test-vtc-syntax`,
  `browser-cache-control-tests`.
