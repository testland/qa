# Readiness run - 2026-09-13

Start 09:02 UTC, stop 09:22 UTC. Four generator processes on perf-gen-01
(4 vCPU, 8 GB, eu-west-1). 2,000 virtual users in total.

`top`, sampled 09:11:

```
  PID   %CPU  COMMAND
 21884  62.1  locust -f load/locustfile.py --headless --users 250 ...
 21885  64.8  locust -f load/locustfile.py --headless --users 250 ...
 21886  61.4  locust -f load/locustfile.py --headless --users 250 ...
 21887  99.4  locust -f load/locustfile.py --headless --users 1250 ...
load average: 3.91 3.88 3.40
```

## Environment

Staging: 1 storefront pod. Production: 6.

Postgres: staging holds 1.8M order rows, production 14.2M.

`/api/products/*`: production serves it through the CDN on a 60s edge TTL.
Staging has no CDN in front of it.

Measurement window: process start to process stop, 09:02 to 09:22, nothing
discarded.
