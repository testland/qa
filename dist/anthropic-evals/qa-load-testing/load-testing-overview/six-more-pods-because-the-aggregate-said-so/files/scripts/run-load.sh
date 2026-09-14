#!/usr/bin/env bash
# November readiness run - executed 2026-09-13
set -eu

HOST=https://staging.northfield.internal
mkdir -p results

for i in 1 2 3 4; do
  ssh "perf-gen-0${i}" \
    "cd /opt/readiness && locust -f load/locustfile.py --headless \
       --users 500 --spawn-rate 2 --run-time 20m \
       --host ${HOST} --csv worker-${i} --exit-code-on-error 1" &
done
wait

for i in 1 2 3 4; do
  scp "perf-gen-0${i}:/opt/readiness/worker-${i}_stats.csv" results/
done

node scripts/aggregate.mjs \
  results/worker-1_stats.csv results/worker-2_stats.csv \
  results/worker-3_stats.csv results/worker-4_stats.csv
