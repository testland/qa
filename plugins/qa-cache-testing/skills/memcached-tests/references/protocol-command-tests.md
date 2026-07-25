# Memcached protocol-command tests

Deep reference for `memcached-tests` SKILL.md. Consult when writing the full
per-command coverage for a Memcached client - set/get/add, TTL semantics, CAS,
and incr/decr. Every test uses the `mc` fixture defined in the SKILL.

## set / get / add

Per [docs.memcached.org/protocols/basic/](https://docs.memcached.org/protocols/basic/):

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

## TTL semantics

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

## CAS (Check-And-Set)

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

## incr / decr

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
