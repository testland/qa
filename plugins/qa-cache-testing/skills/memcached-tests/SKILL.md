---
name: memcached-tests
description: "Wraps Memcached cache testing against a real container: an inline set/get/expire/no-persistence worked example, with the exhaustive protocol-command tests (set/get/add/cas/incr/decr, TTL 0=never-expire / 30-day Unix-timestamp boundary) and the LRU-eviction, consistent-hashing distribution, ElastiCache Auto Discovery, and CI-wiring deep-dives in references/. Use when writing tests for an application that uses Memcached as its primary cache, when verifying ElastiCache Memcached cluster behaviour, or when contrasting Memcached eviction and distribution semantics against Redis."
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

## How to use

1. Install the client + Testcontainers for your language (see Install).
2. Stand up a real Memcached container via the session-scoped fixture - never
   a mock, which loses TTL-tick, LRU eviction, and CAS-token behaviour.
3. Assert one behaviour end to end with the Worked example below
   (set / get / expire / no-persistence).
4. Add the full protocol-command coverage (set/get/add, TTL boundaries, CAS,
   incr/decr) from
   [references/protocol-command-tests.md](references/protocol-command-tests.md).
5. For LRU eviction, multi-node consistent-hashing distribution, ElastiCache
   Auto Discovery, and CI wiring, see
   [references/eviction-distribution-and-ci.md](references/eviction-distribution-and-ci.md).

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

## Worked example: set, read, expire, confirm no persistence

Assert the four signature Memcached behaviours in one pass against the `mc`
fixture - a value round-trips, `add` is refused on an existing key, a short
TTL evicts by expiry, and nothing survives a flush (the no-persistence
guarantee, modelling a node restart):

```python
import time

def test_memcached_end_to_end(mc):
    # 1. set then get - the value round-trips
    mc.set("session:42", b"active")
    assert mc.get("session:42") == b"active"

    # 2. add is refused when the key already exists
    assert mc.add("session:42", b"other") is False

    # 3. a 1 s TTL expires the key (evict-by-expiry)
    mc.set("otp:42", b"123456", expire=1)
    assert mc.get("otp:42") == b"123456"
    time.sleep(1.5)
    assert mc.get("otp:42") is None

    # 4. no persistence - flush models a node restart; data is gone
    mc.flush_all()
    assert mc.get("session:42") is None
```

Run it:

```bash
pytest tests/memcached/ -v
```

That is the whole loop - container up, real client, assert a real cache
behaviour, tear down. From here, expand into the full command matrix and the
cluster-level tests via the two references linked in **How to use**.

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

- Deep detail (with their own citations): full protocol-command tests in
  [references/protocol-command-tests.md](references/protocol-command-tests.md);
  LRU eviction, consistent-hashing distribution, ElastiCache Auto Discovery,
  and CI wiring in
  [references/eviction-distribution-and-ci.md](references/eviction-distribution-and-ci.md).
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
  `redis-cache-tests`,
  `cache-coherence-patterns-reference`,
  `cache-stampede-reference`.
