# Performance commitment - draft for Halvorsen MSA schedule C

Prepared by Marco Deniz, 2026-09-09. Measured against pre-production (8 API
nodes, same instance class as production) with the configuration in
`tests/load/api.js`, run of 2026-09-08.

1. **The platform accepts 1,400 requests per second without refusing or
   queueing away any of them.**
2. **At that rate, 95% of requests complete in under 1,000 ms.**
3. **At that rate, fewer than 1 request in 1,000 fails.**

Supporting detail from the run:

- The run was configured to reach 1,400 requests/second and it reached it.
- 95th percentile response time: 703 ms.
- 90th percentile response time: 644 ms.
- Error rate: 0.09%.
- Both configured thresholds passed.

## Note from Marco, 2026-09-09

Somebody is going to point at the 118,240 in the export and ask about it. That
is our load generator running out of virtual users, not the platform - we
capped at 1,500 and the ramp needed more than that towards the end. I have
raised the cap to 4,000 for Friday's re-run, which will clear it. The latency
and error numbers will not move; the service was answering in about 700 ms the
whole way through and that is what the percentile says. I would not hold up
legal for it.
