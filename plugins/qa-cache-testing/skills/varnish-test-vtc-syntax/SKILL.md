---
name: varnish-test-vtc-syntax
description: "Wraps the varnishtest CLI + VTC (Varnish Test Case) syntax for testing VCL configurations. Covers the VTC test-file format (varnishtest scripts with server { ... } + client { ... } + varnish v1 -vcl+backend { ... } blocks), the grace-mode + saint-mode behaviours (stale-while-revalidate + stale-if-error equivalents in VCL), the PURGE method handler pattern (vcl_purge subroutine + ACL guards), and surrogate-key invalidation via xkey vmod. Use when authoring or testing Varnish-based caching layers."
rating: 22
d6: 4
---

# varnish-test-vtc-syntax

## Overview

`varnishtest` (CLI) executes `.vtc` (Varnish Test Case) files
that spin up a Varnish instance + a mock backend + a mock
client in-process. Per
[varnish-cache.org/docs](https://varnish-cache.org/docs/), VTC is
the canonical way to test VCL - Varnish's configuration language - without a real network.

## When to use

- Authoring or modifying VCL.
- Testing PURGE handlers, grace/saint mode, surrogate-key logic.
- Regression-testing VCL after Varnish version bump.
- CI gate before a VCL deploy.

## Authoring

### Install

Varnish ships `varnishtest` in the standard distribution:

```bash
apt install varnish        # Debian/Ubuntu
brew install varnish       # macOS
varnishtest -v             # verify
```

### Anatomy of a VTC

```
varnishtest "basic cache hit test"

server s1 {
  rxreq
  txresp -hdr "Cache-Control: max-age=60" -body "hello"
} -start

varnish v1 -vcl+backend {
  // VCL goes here
} -start

client c1 {
  txreq -url "/"
  rxresp
  expect resp.status == 200
  expect resp.body == "hello"

  txreq -url "/"
  rxresp
  expect resp.http.x-cache == "HIT"   // assumes vcl_deliver sets this
} -run

varnish v1 -expect cache_hit == 1
```

Per Varnish docs, the VTC file has four block types:

| Block | Purpose |
|---|---|
| `server sN` | Mock origin |
| `varnish vN` | Varnish instance with VCL |
| `client cN` | Send requests, assert responses |
| `barrier`, `delay`, `shell` | Synchronisation + setup |

### Testing PURGE

The canonical pattern from Varnish docs:

```vcl
acl purge {
  "localhost";
  "10.0.0.0"/8;
}

sub vcl_recv {
  if (req.method == "PURGE") {
    if (!client.ip ~ purge) {
      return (synth(403, "Not allowed"));
    }
    return (purge);
  }
}

sub vcl_purge {
  return (synth(200, "Purged"));
}
```

The VTC:

```
client c1 {
  txreq -url "/foo"           // populate cache
  rxresp
  expect resp.status == 200

  txreq -url "/foo" -method "PURGE"
  rxresp
  expect resp.status == 200

  // Next request should hit origin again
  txreq -url "/foo"
  rxresp
  expect resp.http.x-cache == "MISS"
} -run
```

### Grace mode (stale-while-revalidate equivalent)

Per Varnish docs and per
[`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md):

```vcl
sub vcl_backend_response {
  set beresp.grace = 1h;       // serve stale for 1h while async-refreshing
}

sub vcl_deliver {
  if (obj.ttl < 0s) {
    set resp.http.x-cache = "GRACE";
  } else if (obj.hits == 0) {
    set resp.http.x-cache = "MISS";
  } else {
    set resp.http.x-cache = "HIT";
  }
}
```

VTC for grace mode:

```
varnishtest "grace serves stale while refreshing"

server s1 {
  rxreq
  txresp -hdr "Cache-Control: max-age=1"

  rxreq
  delay 2                        // simulate slow refresh
  txresp -hdr "Cache-Control: max-age=1"
} -start

varnish v1 -vcl+backend {
  sub vcl_backend_response {
    set beresp.grace = 60s;
  }
} -start

client c1 {
  txreq -url "/"
  rxresp
  expect resp.status == 200

  delay 1.5                      // past TTL

  txreq -url "/"
  rxresp
  expect resp.status == 200
  expect resp.http.x-cache == "GRACE"
} -run
```

### Surrogate-key (xkey vmod)

```vcl
import xkey;

sub vcl_backend_response {
  set beresp.http.xkey = "user-1 posts-feed";   // tag the object
}

sub vcl_recv {
  if (req.method == "PURGE" && req.http.xkey-purge) {
    set req.http.X-Purges = xkey.softpurge(req.http.xkey-purge);
    return (synth(200));
  }
}
```

## Running

```bash
varnishtest -v cache-tests.vtc
# Or: varnishtest -v tests/*.vtc

# Verbose with full Varnish log output:
varnishtest -vvv cache-tests.vtc
```

Exit code 0 = pass; non-zero = fail.

### Parallel runs

```bash
varnishtest -j 4 tests/*.vtc
```

Each VTC runs in an isolated Varnish instance; parallel-safe.

## Parsing results

`varnishtest` output:

```
**** v1   vsl:  0     SLT_End
**** v1   vsl_dispatch_complete
*    top  TEST cache-tests.vtc passed (1.34)
```

`passed` or `FAILED`. The failure output shows the failing
`expect` line and the actual value.

For CI: parse `passed` / `FAILED` count in the summary.

## CI integration

```yaml
jobs:
  vcl-tests:
    runs-on: ubuntu-latest
    container: varnish:7
    steps:
      - uses: actions/checkout@v5
      - name: Run VCL tests
        run: varnishtest -v tests/vcl/*.vtc
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Testing VCL by hitting a real Varnish in dev | Slow; environment-dependent | Use varnishtest - in-process |
| `delay 60` for TTL test | Tests slow; flaky | Set short TTL (max-age=1, delay 1.5) |
| Missing `-expect cache_hit == N` | Pass relies on observer-affects-system | Always assert cache counters |
| Untested PURGE ACL | Open PURGE = cache-flush DoS | Test 403 from external IP |
| No grace-mode test | Production grace surprises | Verify x-cache GRACE on stale fetch |
| One mega-VTC | Failures opaque | One concern per file |
| Skip `varnishlog` inspection | Hard to debug failures | Use `-vvv` in CI for failure logs |
| Hand-roll surrogate-key without xkey vmod | Manual ban-list grows; slow regex matches | Use xkey vmod |

## Limitations

- **VTC is Varnish-specific.** Doesn't transfer to nginx /
  Apache cache testing.
- **Mock client/server is in-process.** Doesn't catch network-
  layer issues (TLS handshake, slow-client, hostname resolution).
- **xkey vmod requires Varnish Plus or self-compile.** Open-source
  Varnish has `purge.soft` but not surrogate keys natively.
- **Doesn't test CDN-edge behaviour.** Varnish is one tier; full
  multi-tier tests need [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md)
  patterns.

## References

- Varnish documentation:
  [varnish-cache.org/docs/](https://varnish-cache.org/docs/).
- varnishtest reference:
  [varnish-cache.org/docs/latest/reference/varnishtest.html](https://varnish-cache.org/docs/latest/reference/varnishtest.html).
- VTC syntax:
  [varnish-cache.org/docs/latest/reference/vtc.html](https://varnish-cache.org/docs/latest/reference/vtc.html).
- Companion catalogs:
  [`cache-coherence-patterns-reference`](../cache-coherence-patterns-reference/SKILL.md),
  [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md),
  [`cache-stampede-reference`](../cache-stampede-reference/SKILL.md).
- Sibling tools:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md),
  [`browser-cache-control-tests`](../browser-cache-control-tests/SKILL.md).
