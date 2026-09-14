# storefront GET /api/products/[id] - production, last 30 days

Exported 2026-09-15 for CR-473 from the edge and service dashboards.

| Window                         | Requests/s | p50   | p95    | p99    |
|--------------------------------|------------|-------|--------|--------|
| 30-day median                  | 310        | 61 ms | 188 ms | 402 ms |
| Weekday peak, 12:30-13:30      | 810        | 74 ms | 240 ms | 511 ms |
| Black Friday 2025, 20:10-20:40 | 2,310      | 96 ms | 388 ms | 940 ms |

Concurrent sessions at weekday peak, measured at the edge: about 520.

Forecast the November plan is built on: 2,400 requests/second at peak, same
endpoint mix.

Fleet: 6 storefront pods, autoscaler min 4 max 6. Postgres holds 14.2M order rows.
The CDN in front of the site does not cache `/api/products/[id]`; every request
reaches the service.
