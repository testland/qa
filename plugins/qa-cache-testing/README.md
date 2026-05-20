# qa-cache-testing

Cache testing across layers: Redis cache patterns, CDN cache-purge testing (Cloudflare, Fastly, CloudFront), Varnish VTC syntax, browser Cache-Control tests, cache-coherence + stampede + stale-while-revalidate references, and a cache-key collision detector. Covers RFC 9111 HTTP caching and the canonical multi-tier cache discipline (browser to CDN to app to data store).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cache-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
