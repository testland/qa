# Origin pool - capacity notes

Current pool: 6 app instances, 4 workers each.

## Measured

- Sustained ceiling on the pool before p99 latency crosses 2s: **52 requests a
  second** across all routes. Load test 2026-07-14, unchanged since.
- Current origin load across all routes at Monday peak: 31 req/s.
- `/pricing` at Monday peak, if nothing were held at the edge: **68 req/s** on
  its own, taken from the edge's own request counts.

## Incident 2026-06-19

A rule change stopped the edge holding `/pricing` for 41 minutes. The origin
reached the ceiling inside four minutes, the pool shed connections, checkout
error rate went from 0.2% to 11%, and we lost an estimated GBP 46k of orders.
The post-incident action was "never serve /pricing from the origin at peak".
Nobody has written down what to do instead.
