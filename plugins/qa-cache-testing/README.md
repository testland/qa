# qa-cache-testing

Cache testing across layers: Redis cache patterns, CDN cache-purge testing
(Cloudflare, Fastly, CloudFront) with browser-tier Cache-Control tests in
its references, Varnish VTC syntax, a cache-coherence reference (with
stampede and stale-while-revalidate deep references), a cache-key
discriminator audit, and a cache-key collision detector. Covers RFC 9111
HTTP caching and the canonical multi-tier cache discipline (browser to CDN
to app to data store).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [cache-coherence-patterns-reference](skills/cache-coherence-patterns-reference/SKILL.md) | Pure-reference catalog of cache-coherence patterns across the request path; stampede + stale-while-revalidate deep references in references/. |
| Skill | [cdn-cache-purge-tests](skills/cdn-cache-purge-tests/SKILL.md) | Wraps CDN cache-purge testing patterns for Cloudflare / Fastly / CloudFront; client-tier browser Cache-Control tests in references/. |
| Skill | [redis-cache-tests](skills/redis-cache-tests/SKILL.md) | Wraps Redis cache testing patterns: EXPIRE / PEXPIRE / TTL command verification (with the Redis 7+ NX/XX/GT/LT flags), the cache-aside wr... |
| Skill | [varnish-test-vtc-syntax](skills/varnish-test-vtc-syntax/SKILL.md) | Wraps the varnishtest CLI + VTC (Varnish Test Case) syntax for testing VCL configurations. |
| Skill | [cache-key-discriminator-audit](skills/cache-key-discriminator-audit/SKILL.md) | Audits whether a cache key carries every discriminator the response depends on, ranking identity discriminators above presentation ones because a missing tenant is a data leak, not a performance bug. |
| Agent | [cache-key-collision-detector](agents/cache-key-collision-detector.md) | Read-only specialist that scans application code for cache-key collision risks - keys that should be unique per (tenant, user, locale, re... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cache-testing@testland-qa
```
