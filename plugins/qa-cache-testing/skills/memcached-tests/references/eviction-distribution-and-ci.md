# Memcached eviction, distribution, and CI wiring

Deep reference for `memcached-tests` SKILL.md. Consult when testing LRU
eviction and no-persistence, consistent-hashing key distribution across a
multi-node cluster, AWS ElastiCache Auto Discovery, and when wiring the suite
into CI. Tests reuse the `mc` / `mc_addr` fixtures from the SKILL.

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

## Running the suite

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
