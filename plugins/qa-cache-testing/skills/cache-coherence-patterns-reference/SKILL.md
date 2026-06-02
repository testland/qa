---
name: cache-coherence-patterns-reference
description: "Pure-reference catalog of cache-coherence patterns across the request path. Covers the canonical RFC 9111 directives (Cache-Control: max-age, s-maxage, no-cache, no-store, must-revalidate, private/public, immutable; Vary for key derivation; ETag + If-None-Match revalidation), the layered-cache discipline (browser → CDN → reverse-proxy → application → data store), per-tier coherence patterns (write-through, write-back, write-around, cache-aside), and the canonical invalidation strategies (TTL-only, event-driven purge, surrogate keys, version-tagged keys). Use as the cache-design reference when picking patterns or auditing an existing setup. Consumed by redis-cache-tests, cdn-cache-purge-tests, varnish-test-vtc-syntax, browser-cache-control-tests, cache-key-collision-detector."
rating: 23
d6: 4
archetype: S2
---

# cache-coherence-patterns-reference

## Overview

Cache coherence is the discipline of keeping cached values
consistent with their source of truth across multiple tiers
(browser, CDN, reverse-proxy, application, data store). It is
the "C" in "two hard things in computer science" - wrong
coherence shows as stale data, wrong invalidation shows as
cache stampedes per
[`cache-stampede-reference`](../cache-stampede-reference/SKILL.md).

This skill is a **pure reference** consumed by per-tier test
skills.

## When to use

- Designing the cache tiers for a new product / endpoint.
- Auditing an existing cache for coherence bugs (stale reads
  after writes, cross-tenant cache leaks, layered TTLs that
  fight each other).
- PR review of changes to cache headers, Vary, or invalidation
  triggers.
- Investigating "users see stale data" reports.

## The five-tier stack

| Tier | Where | Common TTL | Invalidation |
|---|---|---|---|
| Browser | `Cache-Control: private` | minutes-hours | TTL only (or Service Worker code) |
| CDN | Cloudflare / Fastly / CloudFront / Akamai | seconds-days | Purge API or surrogate-key tag |
| Reverse proxy | Varnish, nginx | seconds-hours | VCL purge / nginx cache_purge |
| Application | Redis / Memcached / in-process | seconds-minutes | Direct delete / pub-sub broadcast |
| Data store | Postgres query cache, RDS read replicas | seconds | Replication-driven |

A coherence bug at any tier surfaces at the user. The test
surface is layered; each tier needs its own coherence tests.

## RFC 9111 directives - the contract layer

Per [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html):

### Response directives (server → cache)

| Directive | RFC ref | Meaning |
|---|---|---|
| `max-age=N` | §5.2.2.1 | "The response is to be considered stale after its age is greater than the specified number of seconds." |
| `s-maxage=N` | §5.2.2.10 | "For a shared cache, the maximum age specified by this directive overrides... max-age." |
| `no-cache` | §5.2.2.4 | "The response MUST NOT be used to satisfy any other request without forwarding it for validation." |
| `no-store` | §5.2.2.5 | "A cache MUST NOT store any part of either the immediate request or the response." |
| `must-revalidate` | §5.2.2.2 | "Once the response has become stale, a cache MUST NOT reuse that response... until it has been successfully validated." |
| `private` | §5.2.2.7 | "A shared cache MUST NOT store the response (intended for a single user)." |
| `public` | §5.2.2.9 | "A cache MAY store the response even if it would otherwise be prohibited." |
| `immutable` | RFC 8246 | Response body will not change for the lifetime of the URL. Browsers skip revalidation. |

Per RFC 9111 §4.2.4: "A cache MUST NOT generate a stale
response unless it is disconnected or doing so is explicitly
permitted by the client or origin server." This is the formal
basis for stale-while-revalidate per
[`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md).

### Vary - the cache key

Per RFC 9111 §4.1: "When a cache receives a request that can be
satisfied by a stored response and that stored response contains
a Vary header field, the cache MUST NOT use that stored response
without revalidation unless all the presented request header
fields nominated by that Vary field value match those fields in
the original request."

Practical: `Vary: Accept-Encoding, Authorization` means
"separate cache entries per (Accept-Encoding, Authorization)
combination." Missing `Vary: Authorization` is the canonical
cross-tenant cache leak per
[`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md)
Test 10.

### ETag + If-None-Match revalidation

Per RFC 9111 §4.3.1: "Another validator is the entity tag given
in an ETag field. One or more entity tags can be used in an
If-None-Match header field for response validation."

Pattern: server returns `ETag: "abc123"`; client sends
`If-None-Match: "abc123"`; server returns `304 Not Modified` or
`200 OK` with new ETag. Bandwidth-efficient but doesn't help
latency (still a round-trip).

## Cache-writing patterns

For application-tier caches (Redis):

| Pattern | Flow | When |
|---|---|---|
| **Cache-aside** (lazy load) | Read miss → read source → populate → return; Write → invalidate cache | Read-heavy, eventual consistency OK |
| **Write-through** | Write → write source → write cache (synchronous) | Strong consistency, latency tolerable |
| **Write-back** | Write → write cache → async write to source | Burst writes; data-loss risk on cache crash |
| **Write-around** | Write → write source (skip cache); reads do cache-aside | Write-heavy with rare re-reads |
| **Refresh-ahead** | Background refresh before TTL expires | Predictable read patterns; hot keys |

## Invalidation strategies

| Strategy | Mechanism | Trade-off |
|---|---|---|
| **TTL-only** | Just let it expire | Simple; possibly-stale window = TTL |
| **Event-driven purge** | Source-of-truth update fires a delete | Coupling; firehose at high write rate |
| **Surrogate keys** (Fastly, Varnish) | Tag responses; purge by tag | Group-invalidation; coordination cost |
| **Version-tagged URLs** | `/api/users?_v=42`; new version = new key | Immutable cache; full deploy per change |
| **Soft purge** | Mark stale, keep serving until refresh | Used by stale-while-revalidate per [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md) |

## Cross-tier coherence problems

| Problem | Where | Detection |
|---|---|---|
| **Browser caches stale page after server purge** | Browser ignores `must-revalidate`, or no `must-revalidate` | E2E test: write → reload → see old |
| **CDN serves stale after origin update** | Purge didn't propagate or `s-maxage` too long | E2E: write → purge → read at CDN edge |
| **Different Vary at browser vs CDN** | CDN strips headers; cache keys diverge | Header-comparison test |
| **Layered TTL inversion** | `s-maxage < max-age` → CDN refreshes more often than browser; browser eventually outpaces CDN | Audit the TTL stack |
| **`Vary: Cookie` without normalised cookies** | Tracker cookies fragment cache; near-zero hit rate | Inspect Vary; normalise |
| **Tenant-scoped data with shared Vary** | Cross-tenant leak per [`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md) | Add `Authorization` to Vary or use private |

## Testable behaviours by tier

| Tier | Test categories |
|---|---|
| Browser | Cache-Control respected (`max-age`, `no-cache`, `must-revalidate`); ETag round-trip; `Vary` honoured |
| CDN | Edge hit/miss vs origin; purge API works end-to-end; `s-maxage` overrides `max-age` |
| Reverse proxy | VCL purge ([`varnish-test-vtc-syntax`](../varnish-test-vtc-syntax/SKILL.md)); grace-mode behaviour |
| Application | Cache-aside write-then-invalidate; key collisions per [`cache-key-collision-detector`](../../agents/cache-key-collision-detector.md) |
| Data store | Replication lag (separate concern; out of scope here) |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Cache-Control: public` on per-user data | Shared cache leaks data | Use `private` for user-specific |
| Missing `Vary: Authorization` | Cross-tenant leak | Add to Vary or set `private` |
| `s-maxage` longer than session lifetime | Logged-out users see another user's data | Match TTL to security window |
| TTL but no purge | Stale-window = TTL even for urgent updates | Implement purge API + use surrogate keys |
| ETag generated per-request from `now()` | Defeats the validation | Stable ETag from content hash |
| `no-cache` instead of `no-store` for sensitive data | Browser still stores; just revalidates | `no-store, no-cache, must-revalidate, private` |
| Browser TTL = CDN TTL = origin TTL | Multi-tier amplifies staleness instead of layering it | Origin lowest, CDN longer, browser shortest |
| Cache-aside without write-then-invalidate | Reads see pre-write state for TTL window | Always invalidate on write |
| `Vary: *` | Disables shared cache entirely | Use specific headers |
| Single Cache-Control for HTML + JSON + assets | One-size doesn't fit; HTML often short, assets long | Per-route directives |

## Limitations

- **RFC 9111 governs HTTP caches only.** Application-tier caches
  (Redis) use their own semantics; coherence is application-
  enforced.
- **Doesn't specify replication.** Read replicas, multi-region
  CDN have their own coherence layer.
- **No global invalidation.** Cross-tier purge requires
  coordination; no built-in protocol.
- **Cache-Control parsing has implementation drift.** Some CDNs
  ignore directives they don't recognise; verify per vendor.

## References

- RFC 9111 HTTP Caching:
  [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html).
- RFC 8246 `immutable`:
  [www.rfc-editor.org/rfc/rfc8246.html](https://www.rfc-editor.org/rfc/rfc8246.html).
- RFC 5861 stale-while-revalidate / stale-if-error (companion):
  [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md).
- Companion catalog:
  [`cache-stampede-reference`](../cache-stampede-reference/SKILL.md).
- Cross-plugin (cross-tenant leaks via cache):
  [`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md).
- Consumed by:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md),
  [`varnish-test-vtc-syntax`](../varnish-test-vtc-syntax/SKILL.md),
  [`browser-cache-control-tests`](../browser-cache-control-tests/SKILL.md),
  [`cache-key-collision-detector`](../../agents/cache-key-collision-detector.md).
