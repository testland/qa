# Readiness run - 2026-09-13

Start 09:02 UTC, stop 09:22 UTC. Four generator boxes (perf-gen-01 to -04, 4 vCPU
/ 8 GB each, eu-west-1), one Locust process on each, 500 virtual users each.

Peak CPU over the window, sampled every 30s: 38%, 41%, 37%, 40%. Load average on
all four stayed under 1.8. Nothing swapped.

Spawning was slowed right down after the 6 September attempt, where ramping fast
tripped the storefront's connection pool before the run got going and we threw the
results away.

The CSVs are whatever the four processes wrote when they exited.

## Staging

One storefront pod. Postgres holds 1.8M order rows. Same image and same pod spec as
production.
