# qa-cache-testing

Cache testing across layers: Redis cache patterns, CDN cache-purge testing (Cloudflare, Fastly, CloudFront), Varnish VTC syntax, browser Cache-Control tests, cache-coherence + stampede + stale-while-revalidate references, and a cache-key collision detector. Covers RFC 9111 HTTP caching and the canonical multi-tier cache discipline (browser to CDN to app to data store).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [browser-cache-control-tests](skills/browser-cache-control-tests/SKILL.md) | Wraps browser-side Cache-Control testing patterns using Playwright (and Cypress for legacy stacks): verifying response Cache-Control head... |
| Skill | [cache-coherence-patterns-reference](skills/cache-coherence-patterns-reference/SKILL.md) | Pure-reference catalog of cache-coherence patterns across the request path. |
| Skill | [cache-stampede-reference](skills/cache-stampede-reference/SKILL.md) | Pure-reference catalog of cache-stampede (thundering-herd) phenomena and mitigations. |
| Skill | [cdn-cache-purge-tests](skills/cdn-cache-purge-tests/SKILL.md) | Wraps CDN cache-purge testing patterns for Cloudflare (POST /zones/{zone_id}/purge_cache, single-file / everything / cache-tags / hostnam... |
| Skill | [memcached-tests](skills/memcached-tests/SKILL.md) | Wraps Memcached cache testing patterns: text and binary protocol command verification (set/get/add/cas/incr/decr), TTL semantics (0=never... |
| Skill | [redis-cache-tests](skills/redis-cache-tests/SKILL.md) | Wraps Redis cache testing patterns: EXPIRE / PEXPIRE / TTL command verification (with the Redis 7+ NX/XX/GT/LT flags), the cache-aside wr... |
| Skill | [stale-while-revalidate-reference](skills/stale-while-revalidate-reference/SKILL.md) | Pure-reference catalog of RFC 5861's stale-while-revalidate + stale-if-error Cache-Control extensions. |
| Skill | [varnish-test-vtc-syntax](skills/varnish-test-vtc-syntax/SKILL.md) | Wraps the varnishtest CLI + VTC (Varnish Test Case) syntax for testing VCL configurations. |
| Agent | [cache-key-collision-detector](agents/cache-key-collision-detector.md) | Read-only specialist that scans application code for cache-key collision risks - keys that should be unique per (tenant, user, locale, re... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cache-testing@testland-qa
```
