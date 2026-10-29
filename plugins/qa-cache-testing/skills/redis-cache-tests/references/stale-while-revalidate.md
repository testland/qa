# stale-while-revalidate and stale-if-error (RFC 5861)

`stale-while-revalidate` (SWR) and `stale-if-error` (SIE) are
Cache-Control extensions defined in
[RFC 5861](https://www.rfc-editor.org/rfc/rfc5861.html), widely
implemented by browsers, CDNs (Cloudflare, Fastly, CloudFront), and
reverse proxies (Varnish via `grace`).

| Directive | When stale-serve happens | Revalidation |
|---|---|---|
| `stale-while-revalidate=N` | Up to N seconds after `max-age` expires | Background async; client sees stale |
| `stale-if-error=N` | Origin returns 5xx, up to N seconds after `max-age` | Client sees stale instead of the 5xx |

## stale-while-revalidate lifecycle

Per [RFC 5861 §3](https://www.rfc-editor.org/rfc/rfc5861.html): "caches
MAY serve the response in which it appears after it becomes stale, up to
the indicated number of seconds." Syntax:
`Cache-Control: max-age=60, stale-while-revalidate=300`.

1. `t < max-age` → fresh cache hit.
2. `max-age < t < max-age + SWR` → stale served **and** one async
   revalidation fires - this is the stampede-mitigation property: only the
   first request revalidates, the herd coasts on stale
   ([stampede.md](stampede.md)).
3. Revalidation succeeds → cache refreshed.
4. `t > max-age + SWR` → truly stale; next request blocks on origin.

Failed-revalidation behaviour differs per vendor (Cloudflare keeps serving
stale until the window expires; Fastly surfaces 5xx sooner; Varnish is
VCL-configurable) - test the actual vendor.

## stale-if-error

Per [RFC 5861 §4](https://www.rfc-editor.org/rfc/rfc5861.html): a stale
response "MAY be used to satisfy the request, regardless of other
freshness information" on origin 500/502/503/504. Composition:

```
Cache-Control: max-age=60, stale-while-revalidate=300, stale-if-error=86400
```

1-minute freshness, 5-minute background-refresh grace, 1-day serve-stale
grace if the origin is down.

## Interaction with must-revalidate

Per RFC 9111, `must-revalidate` forbids serving stale after expiry. It and
SWR are mutually exclusive in spirit; most caches honour the strictest
(`must-revalidate` wins). For SWR / SIE to work, don't add
`must-revalidate`.

## Per-vendor support

| Cache | SWR | SIE | Caveat |
|---|---|---|---|
| Cloudflare | Yes | Yes | Honours response + request directives |
| Fastly | Yes (`Surrogate-Control` or `Cache-Control`) | Yes | Stale-on-error more aggressive |
| CloudFront | Yes (since 2022) | Yes | SIE needs origin error caching policy |
| Varnish | `grace` in VCL | `stale-if-error` | See varnish-test-vtc-syntax |
| nginx | `proxy_cache_use_stale updating` | `... error timeout` | Different keyword |
| Browsers | Yes | Yes | Per-tab behaviour varies; test |
| Service Workers | Manual (Workbox SWR strategy) | n/a | Code-level implementation |

## Testable behaviours

| Behaviour | Test |
|---|---|
| SWR serves stale within window | max-age=1, SWR=300; wait 5s; request → stale + async revalidate |
| SWR triggers exactly one revalidation | Origin sees one revalidate after the stale response returned |
| SWR window enforced | Wait > max-age + SWR; next request blocks on origin |
| SIE serves stale on 5xx | Origin down; request within SIE window → 200 with stale data |
| SIE window enforced | Origin down beyond window → user sees 5xx |
| must-revalidate wins over SWR | Both set → no stale served |
| Stampede mitigation under load | N=1000 concurrent at t=max-age+1s → origin sees 1-2 revalidates |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `must-revalidate, stale-while-revalidate=300` | Contradictory; SWR silently ignored | Drop `must-revalidate` |
| SWR on private user data without `private` | Stale exposure risks | Pair with `private` deliberately |
| SWR=0 | No grace; equivalent to omitting | Use ≥30s |
| SWR window >> max-age (×10+) | Stale for most of the lifetime | Keep proportionate |
| SIE without an origin-5xx alarm | "Site looks fine" while origin is down for days | Pair SIE with monitoring |

## Limitations

- Async revalidation is best-effort; the stale entry can be evicted under
  memory pressure → blocking fetch.
- Cold cache always blocks - SWR needs a previously cached response.
- `no-store` overrides everything.
- Staleness is invisible to users unless a `Warning` header survives (many
  CDNs strip it).

## References

- RFC 5861: [www.rfc-editor.org/rfc/rfc5861.html](https://www.rfc-editor.org/rfc/rfc5861.html)
- Cloudflare Cache-Control docs:
  [developers.cloudflare.com/cache/concepts/cache-control/](https://developers.cloudflare.com/cache/concepts/cache-control/)
- nginx `proxy_cache_use_stale`:
  [nginx.org/en/docs/http/ngx_http_proxy_module.html](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
