# qa-cache-testing

Cache testing across layers: Redis cache patterns, CDN cache-purge testing (Cloudflare, Fastly, CloudFront), Varnish VTC syntax, browser Cache-Control tests, cache-coherence + stampede + stale-while-revalidate references, and a cache-key collision detector. Covers RFC 9111 HTTP caching and the canonical multi-tier cache discipline (browser to CDN to app to data store).

## Components

| Type | Name | Description |
| --- | --- | --- |
| (filled in as components are added) |  |  |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cache-testing@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
