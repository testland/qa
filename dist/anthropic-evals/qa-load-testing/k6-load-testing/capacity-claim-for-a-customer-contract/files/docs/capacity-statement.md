# Performance commitment - draft for Halvorsen MSA schedule C

Prepared by Marco Deniz, 2026-09-09. Measured against pre-production (8 API
nodes, same instance class as production) with the configuration in
`tests/load/api.js`, run of 2026-09-08.

1. **The platform accepts 1,400 requests per second without refusing or
   queueing away any of them.**
2. **At that rate, 95% of requests complete in under 1,000 ms.**

Supporting detail from the run:

- The configured arrival rate reached 1,400 requests/second and nothing was
  dropped.
- 95th percentile response time: 690 ms.
- 90th percentile response time: 672 ms.
- Error rate: 0.09%.
- Both configured thresholds passed.
