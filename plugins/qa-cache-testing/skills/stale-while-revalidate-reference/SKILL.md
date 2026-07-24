---
name: stale-while-revalidate-reference
description: "Pure-reference catalog of RFC 5861's stale-while-revalidate + stale-if-error Cache-Control extensions. Defines stale-while-revalidate=N (caches MAY serve a stale response while asynchronously revalidating, up to N seconds after expiry) and stale-if-error=N (caches MAY serve stale on 5xx upstream errors). Distinguishes from RFC 9111's must-revalidate (forbids serving stale) and from manual cache-aside refresh (synchronous). Covers the interaction with the freshness lifetime (max-age) and the cache-stampede-mitigation properties. Use when designing the cache-refresh boundary or auditing existing Cache-Control headers."
---

# stale-while-revalidate-reference

## Overview

`stale-while-revalidate` (SWR) and `stale-if-error` (SIE) are
Cache-Control extensions defined in
[RFC 5861](https://www.rfc-editor.org/rfc/rfc5861.html). RFC 9111
references them as informative; they are widely implemented by
browsers, CDNs (Cloudflare, Fastly, CloudFront), and reverse
proxies (Varnish via `grace` mode).

Both directives extend the cache lifetime beyond freshness, but
in different ways:

| Directive | When stale-serve happens | What revalidation looks like |
|---|---|---|
| `stale-while-revalidate=N` | Up to N seconds after `max-age` expires | Background async; client sees stale |
| `stale-if-error=N` | When origin returns 5xx, up to N seconds after `max-age` | Synchronous on error; client sees stale instead of 5xx |

## When to use

- Designing the cache-refresh model for an endpoint that values
  availability + latency over freshness.
- Mitigating cache stampedes per
  `cache-stampede-reference`:
  background revalidation = no thundering herd.
- Improving availability under partial origin outage.
- PR review of Cache-Control changes.

## stale-while-revalidate

Per [RFC 5861 §3](https://www.rfc-editor.org/rfc/rfc5861.html):

> "When present in a response, caches MAY serve the response in
> which it appears after it becomes stale, up to the indicated
> number of seconds."

Syntax: `Cache-Control: max-age=60, stale-while-revalidate=300`.

### Lifecycle

1. `t < max-age` → cache hits, response served from cache.
2. `max-age < t < max-age + stale-while-revalidate` → cache hits
   with stale response, **and** cache fires async revalidation
   to origin.
3. Async revalidation succeeds → cache refreshed.
4. `t > max-age + stale-while-revalidate` → "truly stale";
   subsequent request blocks on origin.

The client always sees a response in steps 1-3. Stampedes are
eliminated in step 2 - only the first request triggers
revalidation; others coast on the stale value.

### When the async revalidation fails

The cache may keep serving stale until the SWR window expires.
Vendors differ here:

- **Cloudflare:** keeps serving stale until SWR window expires,
  then enters origin-block mode.
- **Fastly:** more aggressive - surfaces 5xx after one failed
  revalidation.
- **Varnish (via `grace`):** configurable per VCL.

Test the actual behaviour per vendor.

## stale-if-error

Per [RFC 5861 §4](https://www.rfc-editor.org/rfc/rfc5861.html):

> "A cached stale response MAY be used to satisfy the request,
> regardless of other freshness information, provided staleness
> hasn't exceeded the specified limit."

Applies to status codes 500, 502, 503, 504.

Syntax: `Cache-Control: max-age=60, stale-if-error=86400`.

Pattern: 1-minute freshness, but 1-day grace if origin is down.

### Composition with stale-while-revalidate

```
Cache-Control: max-age=60, stale-while-revalidate=300, stale-if-error=86400
```

Interpretation:

| Time | What happens |
|---|---|
| 0-60s | Cache hit, fresh |
| 60-360s | Cache hit, stale; async revalidate |
| 60-86400s and origin returns 5xx | Cache serves stale (last good value) |
| 360s+ if revalidation succeeds | Normally back to fresh after revalidation |
| 86400s + origin down | Truly stale + error |

## Interaction with must-revalidate

Per RFC 9111: `must-revalidate` "Once the response has become
stale, a cache MUST NOT reuse that response to satisfy another
request until it has been successfully validated."

`must-revalidate` and `stale-while-revalidate` are **mutually
exclusive in spirit**. Setting both is undefined behaviour by
RFC 9111 + RFC 5861 reading; most caches honour the strictest
(`must-revalidate` wins).

For SWR / SIE to work, **don't add must-revalidate**.

## Per-vendor support

| Cache | SWR support | SIE support | Caveat |
|---|---|---|---|
| Cloudflare | Yes (since 2018) | Yes | Honours both response and request directives |
| Fastly | Yes (via `Surrogate-Control` or `Cache-Control`) | Yes | Stale-on-error more aggressive |
| CloudFront | Yes (since 2022) | Yes | Stale-on-error needs origin error caching policy |
| Varnish | Yes (`grace` keyword in VCL) | Yes (`stale-if-error`) | See `varnish-test-vtc-syntax` |
| nginx | Yes (`proxy_cache_use_stale updating`) | Yes (`proxy_cache_use_stale error timeout`) | Different config keyword |
| Chrome/Firefox | Yes (browser cache honours SWR/SIE) | Yes | Per-tab behaviour may surprise; test |
| Service Workers | Manual implementation in code | n/a | Workbox provides a SWR strategy |

## Testable behaviours

| Behaviour | Test |
|---|---|
| SWR serves stale within window | Set max-age=1, SWR=300; wait 5s; request → stale served + async revalidate |
| SWR triggers revalidation | Verify origin sees one revalidate request after the user's request returned |
| SWR window enforced | Wait > max-age + SWR; next request blocks origin |
| SIE serves stale on origin 5xx | Take origin down; request within SIE window → 200 with stale data + warning header (RFC 7234 Warning header may be present) |
| SIE window enforced | Origin down beyond SIE window → user sees 5xx |
| SWR + must-revalidate doesn't surface stale | Verify must-revalidate wins |
| Stampede mitigation under load | N=1000 concurrent at t=max-age+1s → origin sees 1-2 revalidates, not 1000 |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Cache-Control: must-revalidate, stale-while-revalidate=300` | Contradictory; must-revalidate wins, SWR silently ignored | Drop `must-revalidate` |
| `stale-while-revalidate` on private user data | Stale for one user could expose old data to that same user | Be deliberate; pair with `private` |
| SWR=0 | No grace period; equivalent to omitting | Use ≥30s |
| SWR window > max-age * 10 | Stale data shown for an excessive fraction of total lifetime | Keep proportionate |
| SIE without alarm on origin 5xx rate | "Site looks fine" but origin down for days | Pair SIE with monitoring |
| Per-page Cache-Control inconsistent (some SWR, some not) | Confusing UX during partial outages | Codify SWR policy per response class |
| Browser ignores SWR (older browsers) | Polyfill via Service Worker for critical paths | Test with target browser matrix |

## Limitations

- **Async revalidation is best-effort.** Cache may evict the
  stale entry before revalidation completes (memory pressure)
  → fall back to blocking fetch.
- **Doesn't help on first request.** SWR requires a previously-
  cached response; cold cache always blocks.
- **Doesn't apply to `no-store`.** That directive overrides
  everything.
- **Origin must be ready for the async revalidation traffic.**
  An overloaded origin gets hit even harder by background
  revalidates from millions of clients.
- **Doesn't propagate the staleness.** The user can't tell
  they're seeing stale data without a `Warning` header (which
  some CDNs strip).

## References

- RFC 5861 stale-while-revalidate + stale-if-error:
  [www.rfc-editor.org/rfc/rfc5861.html](https://www.rfc-editor.org/rfc/rfc5861.html).
- Cloudflare docs on SWR:
  [developers.cloudflare.com/cache/concepts/cache-control/](https://developers.cloudflare.com/cache/concepts/cache-control/).
- nginx `proxy_cache_use_stale`:
  [nginx.org/en/docs/http/ngx_http_proxy_module.html](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).
- Companion catalogs:
  `cache-coherence-patterns-reference`,
  `cache-stampede-reference`.
- Consumed by:
  `cdn-cache-purge-tests`,
  `varnish-test-vtc-syntax`,
  `browser-cache-control-tests`.
