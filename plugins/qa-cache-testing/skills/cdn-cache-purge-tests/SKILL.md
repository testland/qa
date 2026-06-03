---
name: cdn-cache-purge-tests
description: "Wraps CDN cache-purge testing patterns for Cloudflare (POST /zones/{zone_id}/purge_cache, single-file / everything / cache-tags / hostname / prefix), Fastly (POST purge-by-key / purge-all, surrogate-keys via Surrogate-Key header), and CloudFront (CreateInvalidation API + paths). Covers end-to-end test patterns (write origin → trigger purge → assert edge serves fresh), purge-propagation delay testing (typically 1-30s globally), surrogate-key + cache-tag patterns for group-purge, and Cache-Status header verification (cf-cache-status: HIT/MISS/BYPASS). Use when designing or auditing CDN cache-invalidation workflows."
rating: 22
d6: 4
---

# cdn-cache-purge-tests

## Overview

CDN cache-purge tests verify that the
write-origin-then-invalidate-edge sequence works end-to-end - 
the most-likely-broken cache integration in real deployments.

Per
[developers.cloudflare.com/cache/how-to/purge-cache/](https://developers.cloudflare.com/cache/how-to/purge-cache/),
Cloudflare offers five purge methods (Single-file, Everything,
Cache-tags, Hostname, Prefix). Fastly's surrogate-key pattern
and CloudFront's invalidation API offer similar shapes.

## When to use

- Verifying a new purge integration works end-to-end.
- Regression-testing the write-origin-then-purge sequence.
- Auditing existing purge logic before a deploy.
- Investigating "users see stale content after a write."

## Authoring

### Cloudflare - purge by URL

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://example.com/api/users/1"]}'
```

Response:

```json
{ "success": true, "result": { "id": "...." } }
```

### Cloudflare - purge by cache-tag (Enterprise)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  --data '{"tags":["user-1","posts-feed"]}'
```

The response headers from the origin must have included
`Cache-Tag: user-1, posts-feed` for this to work.

### Fastly - purge by surrogate-key

```bash
curl -X POST "https://api.fastly.com/service/${SERVICE_ID}/purge/${SURROGATE_KEY}" \
  -H "Fastly-Key: ${FASTLY_API_TOKEN}"
```

Origin responses include `Surrogate-Key: user-1 posts-feed` (space-separated).

### CloudFront - invalidation

```bash
aws cloudfront create-invalidation \
  --distribution-id ${DIST_ID} \
  --paths "/api/users/1" "/api/users/1/*"
```

Cloud-side wait + propagation. Returns an InvalidationId; poll
status via `get-invalidation`.

## Running - end-to-end test

The canonical purge test:

```python
import requests, time

def test_write_then_purge_serves_fresh():
    # 1. Origin write
    origin_response = requests.post(
        "https://origin.example.com/api/users/1",
        json={"name": "Alice"},
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    )
    assert origin_response.status_code == 200

    # 2. Verify edge has the *old* value (might or might not — cache hit)
    edge_before = requests.get("https://example.com/api/users/1")
    cache_status_before = edge_before.headers.get("cf-cache-status")

    # 3. Trigger purge
    purge = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache",
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
        json={"files": ["https://example.com/api/users/1"]},
    )
    assert purge.json()["success"]

    # 4. Wait for global propagation (Cloudflare typically <30s)
    time.sleep(10)

    # 5. Verify edge fetches fresh from origin
    edge_after = requests.get("https://example.com/api/users/1")
    cache_status_after = edge_after.headers.get("cf-cache-status")

    # Either MISS (just fetched) or HIT (re-cached fresh value)
    assert cache_status_after in ("MISS", "HIT", "EXPIRED")
    assert edge_after.json()["name"] == "Alice"
```

### Cache-Status header verification

| Header | CDN | Common values |
|---|---|---|
| `cf-cache-status` | Cloudflare | HIT, MISS, EXPIRED, BYPASS, DYNAMIC, REVALIDATED |
| `x-cache` | Fastly | HIT, MISS, HIT-CLUSTER, HIT-CLUSTER-WAIT |
| `x-cache` | CloudFront | Hit from cloudfront, Miss from cloudfront |
| `age` | RFC 9111 standard | Seconds since cached |

### Multi-region propagation

```python
EDGES = [
    "https://example.com",     # default
    "https://eu.example.com",  # geo-routed
    "https://ap.example.com",
]

def test_purge_propagates_globally():
    # Pre-cache in each region
    for url in EDGES:
        requests.get(url + "/api/users/1")

    # Trigger purge
    purge_url(API, "/api/users/1")

    # Wait for global propagation
    time.sleep(30)

    # Verify each region serves fresh
    for url in EDGES:
        r = requests.get(url + "/api/users/1")
        assert r.json()["name"] == "Alice"
```

## Parsing results

| Field | Use |
|---|---|
| `cf-cache-status: HIT` | Served from edge cache |
| `cf-cache-status: MISS` | Origin pull just happened |
| `cf-cache-status: EXPIRED` | Stale; revalidated from origin |
| `cf-cache-status: BYPASS` | Cache deliberately skipped (e.g., uncacheable response) |
| `cf-cache-status: DYNAMIC` | Not cached at all |
| `age: N` | Per RFC 9111: seconds since cached |

For tests: assert on the **transition** (HIT → MISS after purge),
not on the absolute state.

## CI integration

```yaml
jobs:
  cdn-purge-smoke:
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Write to origin
        env:
          ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
        run: ./scripts/write-test-fixture.sh
      - name: Purge edge
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
        run: ./scripts/purge-test-paths.sh
      - name: Verify edge serves fresh
        run: pytest tests/cdn/test_purge_propagation.py
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.sleep(60)` between purge + assertion | Slow; sometimes shorter / sometimes longer | Poll `cf-cache-status` until MISS (timeout 30s) |
| Test purge against prod | Pollutes prod cache; rate-limited | Dedicated test domain + zone |
| Purge-everything for smoke test | Massive cache flush; alarming for ops | Single-file or tag-based |
| Don't test multi-region | Edge in test region; user in another sees stale | Verify across regions |
| No `Cache-Tag` / `Surrogate-Key` on origin | Group-purge has nothing to target | Origin must set tags |
| Use only cf-cache-status to verify fresh | Could be HIT of newly-purged fresh fetch | Compare response body to known fresh state |
| Skip purge-key naming review | Hot keys (`all`, `feed`) become noisy | Per-resource tagging strategy |
| Assume purge is synchronous | Cloudflare: <30s; CloudFront: minutes | Plan for async; poll |

## Limitations

- **Per-vendor behaviour differs.** Cloudflare and Fastly purge
  in seconds; CloudFront invalidations take longer. Test against
  the actual vendor in use.
- **Purge rate limits.** Cloudflare has per-zone tag-purge limits;
  Fastly has API-call rate limits. Tests can hit these.
- **Edge node consistency.** Even within a CDN, edge nodes refresh
  at slightly different times. Cross-edge tests need tolerance.
- **Doesn't test the origin's behaviour.** If origin sends
  uncacheable responses, purge does nothing. Pair with origin
  Cache-Control tests via [`browser-cache-control-tests`](../browser-cache-control-tests/SKILL.md).

## References

- Cloudflare cache-purge methods:
  [developers.cloudflare.com/cache/how-to/purge-cache/](https://developers.cloudflare.com/cache/how-to/purge-cache/).
- Cloudflare purge API:
  [developers.cloudflare.com/api/operations/zone-purge](https://developers.cloudflare.com/api/operations/zone-purge).
- Fastly purge docs:
  [docs.fastly.com/en/guides/purging-api](https://docs.fastly.com/en/guides/purging-api).
- CloudFront CreateInvalidation:
  [docs.aws.amazon.com/cloudfront/latest/APIReference/API_CreateInvalidation.html](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CreateInvalidation.html).
- Companion catalogs:
  [`cache-coherence-patterns-reference`](../cache-coherence-patterns-reference/SKILL.md),
  [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md).
- Sibling tools:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`varnish-test-vtc-syntax`](../varnish-test-vtc-syntax/SKILL.md),
  [`browser-cache-control-tests`](../browser-cache-control-tests/SKILL.md).
