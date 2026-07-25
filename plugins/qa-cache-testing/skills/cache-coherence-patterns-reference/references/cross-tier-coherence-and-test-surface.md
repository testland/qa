# Cross-tier coherence problems and the per-tier test surface

Deep reference for `cache-coherence-patterns-reference` SKILL.md. Consult
when auditing an existing multi-tier cache for coherence bugs and when
deciding what to test at each tier.

## Cross-tier coherence problems

A coherence bug at any tier surfaces at the user; the failure usually
lives in the seam between two tiers, not inside one.

| Problem | Where | Detection |
|---|---|---|
| **Browser caches stale page after server purge** | Browser ignores `must-revalidate`, or no `must-revalidate` | E2E test: write → reload → see old |
| **CDN serves stale after origin update** | Purge didn't propagate or `s-maxage` too long | E2E: write → purge → read at CDN edge |
| **Different Vary at browser vs CDN** | CDN strips headers; cache keys diverge | Header-comparison test |
| **Layered TTL inversion** | `s-maxage < max-age` → CDN refreshes more often than browser; browser eventually outpaces CDN | Audit the TTL stack |
| **`Vary: Cookie` without normalised cookies** | Tracker cookies fragment cache; near-zero hit rate | Inspect Vary; normalise |
| **Tenant-scoped data with shared Vary** | Cross-tenant leak per `cross-tenant-data-leak-tests` | Add `Authorization` to Vary or use private |

## Testable behaviours by tier

Each tier needs its own coherence tests; the categories below map to the
per-tier test skills that consume this reference.

| Tier | Test categories |
|---|---|
| Browser | Cache-Control respected (`max-age`, `no-cache`, `must-revalidate`); ETag round-trip; `Vary` honoured |
| CDN | Edge hit/miss vs origin; purge API works end-to-end; `s-maxage` overrides `max-age` |
| Reverse proxy | VCL purge (`varnish-test-vtc-syntax`); grace-mode behaviour |
| Application | Cache-aside write-then-invalidate; key collisions |
| Data store | Replication lag (separate concern; out of scope here) |
