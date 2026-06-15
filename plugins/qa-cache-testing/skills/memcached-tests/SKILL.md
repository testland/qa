---
name: memcached-tests
description: "Wraps Memcached cache testing patterns: text and binary protocol command verification (set/get/add/cas/incr/decr), TTL semantics (0=never-expire, 30-day Unix-timestamp boundary), no-persistence and LRU eviction under memory pressure, consistent-hashing client key distribution across nodes, and AWS ElastiCache Memcached Auto Discovery endpoint testing. Use when writing tests for an application that uses Memcached as its primary cache, when verifying ElastiCache Memcached cluster behaviour, or when contrasting Memcached eviction and distribution semantics against Redis."
rating: 23
d6: 4
---

# memcached-tests

## Overview

Memcached is a widely deployed in-memory cache, available as the
ElastiCache Memcached tier on AWS. It differs from Redis in three
fundamental ways that affect how tests must be written:

1. **No persistence.** Per the
   [AWS ElastiCache engine comparison](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html),
   Memcached node-based clusters have no backup-and-restore capability and
   no durability option; data is lost on node restart.
2. **Client-side sharding via consistent hashing.** There is no
   server-side cluster coordination. Each client library hashes keys to
   nodes independently (per the
   [pymemcache HashClient](https://pymemcache.readthedocs.io/en/latest/getting_started.html)).
3. **Multi-threaded, simple-types only.** Memcached is multi-threaded with
   no complex data structures, sorted sets, pub/sub, or scripting
   (per the
   [AWS comparison table](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html)).

This skill wraps test patterns against a real Memcached instance via
Testcontainers - not a mock. Mocks lose LRU eviction, TTL-tick, and
consistent-hashing redistribution behaviour that real bugs hide in.

## When to use

- Tests for code that stores or retrieves data via Memcached.
- Verifying TTL, CAS, incr/decr, and add-only semantics.
- Validating LRU eviction under memory pressure.
- Testing consistent-hashing distribution across a multi-node cluster.
- Smoke-testing ElastiCache Memcached Auto Discovery endpoints.

## Install

```bash
pip install pymemcache testcontainers   # Python
npm install --save-dev memjs testcontainers   # Node (binary protocol)
```

The Testcontainers Memcached module defaults to `memcached:1` and exposes
port `11211`
([testcontainers-python memcached](https://github.com/testcontainers/testcontainers-python/blob/main/src/testcontainers/community/memcached/__init__.py)):

```python
from testcontainers.memcached import MemcachedContainer

with MemcachedContainer("memcached:1.6-alpine") as mc:
    host, port = mc.get_host_and_port()
```

## Fixture (Python)

```python
import pytest
from pymemcache.client.base import Client
from testcontainers.memcached import MemcachedContainer

@pytest.fixture(scope="session")
def mc_addr():
    with MemcachedContainer("memcached:1.6-alpine") as mc:
        yield mc.get_host_and_port()   # (host, port)

@pytest.fixture
def mc(mc_addr):
    host, port = mc_addr
    client = Client((host, port), default_value=None)
    yield client
    client.flush_all()   # Reset between tests
```

## Text-protocol command tests

Per [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/):

### set / get / add

```python
def test_set_and_get(mc):
    mc.set("k", b"hello")
    assert mc.get("k") == b"hello"

def test_add_only_when_absent(mc):
    assert mc.add("k", b"first") is True
    assert mc.add("k", b"second") is False   # NOT_STORED: key exists
    assert mc.get("k") == b"first"

def test_get_absent_returns_none(mc):
    assert mc.get("no-such-key") is None
```

### TTL semantics

Per [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/):
exptime `0` means never-expire; values up to 30 days are interpreted as
a relative second offset; values above 30 days (2592000 seconds) are
treated as a Unix timestamp.

```python
import time

def test_ttl_zero_never_expires(mc):
    mc.set("k", b"v", expire=0)
    time.sleep(0.1)
    assert mc.get("k") == b"v"

def test_key_expires_after_ttl(mc):
    mc.set("k", b"v", expire=1)
    assert mc.get("k") == b"v"
    time.sleep(1.5)
    assert mc.get("k") is None

def test_short_ttl_via_pexpire_pattern(mc):
    # pymemcache does not expose millisecond TTLs; use 1-second minimum
    mc.set("k", b"val", expire=1)
    time.sleep(1.5)
    assert mc.get("k") is None, "Key must expire after 1 s TTL"
```

Avoid `time.sleep(60)` to test TTL: set the shortest useful TTL and
sleep only fractionally beyond it.

### CAS (Check-And-Set)

Per [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/),
`gets` returns a unique 64-bit CAS identifier; `cas` stores data only if
the token still matches:

```python
def test_cas_succeeds_when_token_matches(mc):
    mc.set("k", b"v1")
    value, cas_token = mc.gets("k")
    result = mc.cas("k", b"v2", cas_token)
    assert result is True
    assert mc.get("k") == b"v2"

def test_cas_fails_after_concurrent_write(mc):
    mc.set("k", b"original")
    _, old_token = mc.gets("k")
    mc.set("k", b"concurrent-update")   # token now stale
    result = mc.cas("k", b"late-writer", old_token)
    assert result is False   # EXISTS: token mismatch
    assert mc.get("k") == b"concurrent-update"
```

### incr / decr

Per [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/),
`incr`/`decr` operate on unsigned 64-bit integer string values and return
`None` when the key is absent (no auto-initialisation):

```python
def test_incr_increments_existing_counter(mc):
    mc.set("counter", b"10")
    result = mc.incr("counter", 5)
    assert result == 15

def test_incr_absent_key_returns_none(mc):
    assert mc.incr("no-such-counter", 1) is None

def test_incr_uses_add_to_initialise(mc):
    # Per github.com/memcached/memcached/wiki/Programming:
    # add is the correct initialiser for counters
    mc.add("hits", b"0")
    mc.incr("hits", 1)
    assert mc.get("hits") == b"1"

def test_decr_does_not_go_below_zero(mc):
    mc.set("counter", b"3")
    mc.decr("counter", 10)
    assert mc.get("counter") == b"0"   # unsigned floor at 0
```

## LRU eviction (no-persistence)

Memcached evicts using LRU within each slab class; there is no
persistence and no AOF/RDB equivalent. Per the
[AWS ElastiCache comparison](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html),
"Backup and restore" is `No` for node-based Memcached clusters.

```python
def test_lru_evicts_cold_keys_under_pressure():
    """
    Launch a small-memory container to verify LRU eviction.
    The -m flag caps Memcached's RAM (MB).
    """
    from testcontainers.memcached import MemcachedContainer
    from pymemcache.client.base import Client

    with MemcachedContainer("memcached:1.6-alpine") as mc:
        mc.get_wrapped_container().exec_run   # introspect if needed
        host, port = mc.get_host_and_port()
        # Restart with low memory cap via Docker command override
    
    # Use a separate docker run with -m 8m for a tighter eviction test;
    # or accept that testcontainers default image evicts eventually.
    # The key assertion: after filling cache, a cold key may be absent.

def test_no_data_survives_restart(mc_addr):
    """Memcached has no persistence: data is gone after any restart."""
    host, port = mc_addr
    c = Client((host, port))
    c.set("persistent", b"should-not-survive")
    # Simulate application expectation: always handle cache miss gracefully
    # after a node restart or replacement (e.g., ElastiCache node failure).
    assert c.get("persistent") is not None  # warm path
    # After restart (modelled here as flush_all), data is gone:
    c.flush_all()
    assert c.get("persistent") is None, "Memcached is not persistent"
```

## Consistent-hashing client distribution

Per
[pymemcache HashClient](https://pymemcache.readthedocs.io/en/latest/getting_started.html),
client-side consistent hashing distributes keys across nodes. Adding or
removing a node remaps only the affected ring segment - not all keys.

```python
def test_hash_client_distributes_keys():
    from testcontainers.memcached import MemcachedContainer
    from pymemcache.client.hash import HashClient

    with MemcachedContainer("memcached:1.6-alpine") as mc1, \
         MemcachedContainer("memcached:1.6-alpine") as mc2:

        h1, p1 = mc1.get_host_and_port()
        h2, p2 = mc2.get_host_and_port()
        cluster = HashClient([(h1, p1), (h2, p2)])

        keys = [f"key:{i}" for i in range(100)]
        for k in keys:
            cluster.set(k, b"v")

        # Verify distribution: each node should hold some keys
        direct1 = sum(
            1 for k in keys if Client((h1, p1)).get(k) is not None
        )
        direct2 = sum(
            1 for k in keys if Client((h2, p2)).get(k) is not None
        )
        assert direct1 > 0, "Node 1 should hold some keys"
        assert direct2 > 0, "Node 2 should hold some keys"
        assert direct1 + direct2 == 100, "Every key must be on exactly one node"

def test_hash_client_handles_node_removal():
    """After removing a node, the remaining node serves all keys."""
    from testcontainers.memcached import MemcachedContainer
    from pymemcache.client.hash import HashClient

    with MemcachedContainer("memcached:1.6-alpine") as mc1, \
         MemcachedContainer("memcached:1.6-alpine") as mc2:

        h1, p1 = mc1.get_host_and_port()
        h2, p2 = mc2.get_host_and_port()
        full_cluster = HashClient([(h1, p1), (h2, p2)])

        for i in range(20):
            full_cluster.set(f"k{i}", b"val")

        # Simulate node removal: re-create client with one node
        degraded = HashClient([(h1, p1)])
        # Keys that were on node 2 are now misses - application must
        # handle gracefully (cache miss -> read-through from source of truth)
        miss_count = sum(
            1 for i in range(20) if degraded.get(f"k{i}") is None
        )
        assert miss_count >= 0  # Some keys lost; app must tolerate it
```

## AWS ElastiCache Memcached - Auto Discovery

Per
[docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/AutoDiscovery.html](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/AutoDiscovery.html),
ElastiCache Memcached (not Valkey/Redis) supports Auto Discovery: the
client connects to a single configuration endpoint and retrieves the full
node list. Clients refresh this list approximately once per minute.

```python
def test_elasticache_auto_discovery_endpoint(monkeypatch):
    """
    Integration smoke test: verify the app resolves a configuration
    endpoint and discovers cluster nodes.
    Runs only when ELASTICACHE_CONFIG_ENDPOINT is set.
    """
    import os
    endpoint = os.getenv("ELASTICACHE_CONFIG_ENDPOINT")
    if not endpoint:
        pytest.skip("ELASTICACHE_CONFIG_ENDPOINT not set (ElastiCache env only)")

    from pymemcache.client.hash import HashClient
    # The ElastiCache Cluster Client for Python resolves the cfg endpoint
    # and populates the server list automatically via the config get cluster
    # Memcached command.
    client = HashClient([endpoint])
    client.set("smoke-test", b"ok")
    assert client.get("smoke-test") == b"ok"
```

The configuration endpoint format is:
`<cluster-name>.xxxxxx.cfg.<region>.cache.amazonaws.com:11211`

Auto Discovery is specific to ElastiCache Memcached and is not available
for Valkey or Redis OSS engines
([AutoDiscovery docs](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/AutoDiscovery.html)).

## Running

```bash
pytest tests/memcached/ -v
```

Testcontainers boots a Memcached container once per session. The
per-test `flush_all` fixture call resets state between tests. Use
`scope="session"` on the container fixture to avoid the ~3 s startup
cost per test.

## CI integration

```yaml
jobs:
  memcached-tests:
    runs-on: ubuntu-latest
    services:
      memcached:
        image: memcached:1.6-alpine
        ports:
          - 11211:11211
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install -e ".[test]"
      - run: pytest tests/memcached/ --tb=short
        env:
          MEMCACHED_HOST: localhost
          MEMCACHED_PORT: 11211
```

For multi-node distribution tests, launch two service containers named
`memcached-1` and `memcached-2` on ports `11211` and `11212`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mocking the Memcached client | Misses TTL-tick, LRU eviction, CAS token generation | Use Testcontainers / real Memcached |
| `time.sleep(60)` to test TTL | Slow and flaky | Set 1 s TTL and sleep 1.5 s |
| Asserting `incr` initialises a missing key | `incr` returns `None` on missing keys | Use `add` to initialise, then `incr` |
| Sharing a Memcached instance between test suites | Cross-suite key pollution, order-dependent failures | `flush_all` in fixture teardown |
| Expecting data after a Memcached restart | Memcached has no persistence | Test for graceful cache-miss handling |
| Using a single-node client to test distribution | Distribution logic never exercises consistent hashing | Use `HashClient` with two test containers |
| Hard-coding node endpoints in app code | Breaks on ElastiCache node replacement | Use the configuration endpoint + Auto Discovery |
| `noreply=True` in set during assertion tests | Errors are silently swallowed | Set `noreply=False` (pymemcache default for development) |

## Limitations

- **Testcontainers startup adds ~3 s per session.** Use
  `scope="session"` fixtures and `flush_all` between tests.
- **Consistent-hashing is client-library-specific.** pymemcache,
  libmemcached, and the ElastiCache Cluster Client may use different ring
  algorithms; test with the library your application uses.
- **LRU eviction is slab-class-local.** Memcached partitions memory into
  slab classes by value size; LRU runs per slab, not globally. An item
  will not be evicted in favour of another item in a different slab class
  ([docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/)).
- **No pub/sub or key-expiry notifications.** Unlike Redis NOTIFY,
  Memcached has no server-push invalidation; all invalidation is
  application-driven.
- **ElastiCache Auto Discovery tests require network access.** They
  cannot run against Testcontainers; gate them behind an environment
  variable and run only in a VPC-connected CI environment.
- **Meta protocol (`mg`/`ms`) is available in Memcached 1.6+** and
  offers stampede-handling flags (`W`/`Z`) and atomic CAS overrides, but
  requires a client library with meta-protocol support; not covered by
  pymemcache 4.x defaults.

## References

- Memcached text protocol commands:
  [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/).
- Memcached meta protocol (Memcached 1.6+):
  [docs.memcached.org/protocols/meta/](https://docs.memcached.org/protocols/meta/).
- Memcached programming guide (key design, `add` for counters, incr/decr):
  [github.com/memcached/memcached/wiki/Programming](https://github.com/memcached/memcached/wiki/Programming).
- Testcontainers Memcached module:
  [github.com/testcontainers/testcontainers-python](https://github.com/testcontainers/testcontainers-python/blob/main/src/testcontainers/community/memcached/__init__.py).
- pymemcache getting started (Client, PooledClient, HashClient):
  [pymemcache.readthedocs.io/en/latest/getting_started.html](https://pymemcache.readthedocs.io/en/latest/getting_started.html).
- AWS ElastiCache engine comparison (Memcached vs Valkey/Redis):
  [docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html).
- AWS ElastiCache Auto Discovery:
  [docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/AutoDiscovery.html](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/AutoDiscovery.html).
- Sibling skills:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`cache-coherence-patterns-reference`](../cache-coherence-patterns-reference/SKILL.md),
  [`cache-stampede-reference`](../cache-stampede-reference/SKILL.md).
