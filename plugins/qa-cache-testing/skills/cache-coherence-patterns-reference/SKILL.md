---
name: cache-coherence-patterns-reference
description: "Pure-reference catalog of cache-coherence patterns across the request path. Defines the five-tier cache stack (browser → CDN → reverse-proxy → application → data store), the per-tier cache-writing patterns (cache-aside, write-through, write-back, write-around, refresh-ahead), and the canonical invalidation strategies (TTL-only, event-driven purge, surrogate keys, version-tagged URLs, soft purge), plus an anti-pattern table and a worked multi-tenant coherence-test example. Deep detail - the RFC 9111 Cache-Control / Vary / ETag directive tables and the cross-tier coherence + per-tier test surface - lives in references/. Use for pattern selection, Cache-Control header design, and coherence audits; use a cache-key-collision check when the question is whether two requests in an existing system collide on a concrete key scheme. Consumed by redis-cache-tests, cdn-cache-purge-tests, varnish-test-vtc-syntax, browser-cache-control-tests, and the cache-key-collision check."
---

# cache-coherence-patterns-reference

## Overview

Keeping cached values consistent with their source of truth
across tiers (browser, CDN, reverse-proxy, application, data
store). Wrong coherence shows as stale data; wrong invalidation
shows as cache stampedes per `cache-stampede-reference`. A
**pure reference** consumed by per-tier test skills.

## When to use

- Designing the cache tiers for a new product / endpoint.
- Auditing an existing cache for coherence bugs (stale reads
  after writes, cross-tenant cache leaks, layered TTLs that
  fight each other).
- PR review of changes to cache headers, Vary, or invalidation
  triggers.
- Investigating "users see stale data" reports.

## How to use this reference

1. **Locate the tier(s)** the value lives in from the five-tier stack -
   each tier (browser, CDN, reverse proxy, application, data store) has
   its own TTL and invalidation mechanism.
2. **Choose the write pattern** for the application tier from the
   cache-writing patterns table (cache-aside, write-through, write-back,
   write-around, refresh-ahead) based on the read/write mix and how much
   consistency you need.
3. **Choose the invalidation strategy** from the invalidation strategies
   table (TTL-only, event-driven purge, surrogate keys, version-tagged
   URLs, soft purge) based on the staleness window you can tolerate.
4. **Set the contract** - design the `Cache-Control` directives, `Vary`
   key, and ETag validators per
   [references/rfc-9111-http-caching-directives.md](references/rfc-9111-http-caching-directives.md).
5. **Write the per-tier coherence test** from the cross-tier problems and
   test-surface catalog in
   [references/cross-tier-coherence-and-test-surface.md](references/cross-tier-coherence-and-test-surface.md),
   then re-check the design against the Anti-patterns table below.

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
| **Soft purge** | Mark stale, keep serving until refresh | Used by stale-while-revalidate per `stale-while-revalidate-reference` |

## Worked example: a multi-tenant dashboard endpoint

Scenario: `/api/users` serves per-tenant dashboard data, is read-heavy,
and must never leak one tenant's rows to another. Walk the four decisions
from **How to use this reference**, then the test.

1. **Tiers.** The response flows browser → CDN → application (Redis) →
   data store. Because the payload is per-user, it must not sit in a
   shared cache: the browser tier gets `Cache-Control: private` and the
   CDN is bypassed for this route (or keyed per tenant), not left on the
   shared edge.
2. **Write pattern.** Reads dominate and eventual consistency after a
   profile edit is acceptable, so the application tier uses **cache-aside**:
   a read miss loads from the data store and populates Redis; a write
   invalidates the tenant's Redis key.
3. **Invalidation.** A profile edit is an urgent update, so TTL-only is
   not enough - pair the TTL with **event-driven purge** so the write
   fires a delete of the tenant's cache key immediately.
4. **Contract.** Set `Vary: Authorization` so each tenant gets a separate
   cache entry (the fix for the cross-tenant leak in the Anti-patterns
   table), and add a content-hash `ETag` so an unchanged reload returns
   `304 Not Modified` instead of the full body.

Coherence test (the browser-tier "write → reload → see old" case):

- **Arrange:** tenant A loads `/api/users`; the response is cached.
- **Act:** tenant A edits a user - which must fire the Redis purge - then
  reloads the page.
- **Assert (staleness):** the reload shows the edited value, not the
  pre-write state. A failure here means the write path skipped the
  invalidate - the "cache-aside without write-then-invalidate"
  anti-pattern.
- **Assert (isolation):** a request from tenant B with a different
  `Authorization` header never returns tenant A's cached rows, proving the
  `Vary: Authorization` split holds.

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

## Deep references

The contract layer and the audit-and-test surface live in two companion
references so this file stays a decision surface:

- **RFC 9111 directive tables** - `Cache-Control` response directives,
  `Vary` key derivation, and `ETag` / `If-None-Match` revalidation:
  [references/rfc-9111-http-caching-directives.md](references/rfc-9111-http-caching-directives.md).
- **Cross-tier coherence problems + per-tier test surface** - the seam
  bugs to audit for and what to test at each tier:
  [references/cross-tier-coherence-and-test-surface.md](references/cross-tier-coherence-and-test-surface.md).

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
  [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html);
  full directive tables in
  [references/rfc-9111-http-caching-directives.md](references/rfc-9111-http-caching-directives.md).
- RFC 8246 `immutable`:
  [www.rfc-editor.org/rfc/rfc8246.html](https://www.rfc-editor.org/rfc/rfc8246.html).
- Cross-tier coherence problems + per-tier test surface (with their
  cross-references):
  [references/cross-tier-coherence-and-test-surface.md](references/cross-tier-coherence-and-test-surface.md).
- RFC 5861 stale-while-revalidate / stale-if-error (companion):
  `stale-while-revalidate-reference`.
- Companion catalog:
  `cache-stampede-reference`.
- Cross-tenant leaks via cache:
  `cross-tenant-data-leak-tests`.
- Consumed by:
  `redis-cache-tests`,
  `cdn-cache-purge-tests`,
  `varnish-test-vtc-syntax`,
  `browser-cache-control-tests`.
