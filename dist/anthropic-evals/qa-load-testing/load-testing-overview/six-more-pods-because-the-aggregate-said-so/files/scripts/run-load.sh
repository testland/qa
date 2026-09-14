#!/usr/bin/env bash
# November readiness run - executed 2026-09-13 on perf-gen-01 (4 vCPU, 8 GB)
set -u

HOST=https://staging.northfield.internal
mkdir -p results

for i in 1 2 3; do
  locust -f load/locustfile.py --headless \
    --users 250 --spawn-rate 25 --run-time 20m \
    --host "$HOST" --csv "results/worker-${i}" &
done

# the remainder of the 2000 users, on the same box
locust -f load/locustfile.py --headless \
  --users 1250 --spawn-rate 50 --run-time 20m \
  --host "$HOST" --csv results/worker-4 &

wait

node scripts/aggregate.mjs \
  results/worker-1_stats.csv results/worker-2_stats.csv \
  results/worker-3_stats.csv results/worker-4_stats.csv
