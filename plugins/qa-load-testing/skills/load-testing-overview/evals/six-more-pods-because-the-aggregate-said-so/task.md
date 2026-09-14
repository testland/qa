# Sign-off needed on CR-473 before Friday's freeze

## Problem Description

I am the engineering manager for Northfield storefront and I have a change
request on my desk that I have to approve or reject before the infrastructure
freeze closes on Friday 18th. It asks for six additional application pods for the
November peak, at about 4,100 a month, on the strength of a single number out of
Saturday's readiness run.

I want to approve it if it is right. Marcus has clearly thought about the
statistics - he goes out of his way in the CR to explain what he is deliberately
not doing with them - and on the face of it that run is the only real evidence
anybody has. What nags at me is that our production p95 on that same endpoint
right now, at normal traffic, is 240 ms on six pods.

Everything Marcus ran is attached: the launcher, the test file, the four CSVs it
produced, the little script that turns them into the number, its test suite, and
the notes he took while it ran. Node 22 is on the box; `npm test` is `node --test`.

Tell me whether I can sign CR-473 on this evidence, and if the answer is no, tell
me what we run instead and when we would have a number I can act on. The November
plan needs a decision either way and the freeze is Friday.

## Output Specification

1. Write `docs/capacity-review.md`: your verdict on CR-473, what each piece of the
   evidence does and does not support, and the run you would do instead with the
   exact command.
2. Change `scripts/aggregate.mjs` so it stops producing any figure the evidence
   cannot support. `node --test` must pass when you are finished; update an
   expectation if your change makes it wrong, rather than deleting the case.
3. Do not edit the CSVs or the run notes.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/change-request-473.md ===============
# CR-473 - six additional storefront pods for November peak

Raised by: M. Ilves, 2026-09-14
Cost: EUR 4,112 / month (6 x c6i.xlarge equivalent)
Needed by: infrastructure freeze, 2026-09-18

## Justification

Saturday's readiness run drove 4x projected November traffic at staging for 20
minutes across four load generators. The run's p95 came out at **2,810 ms**
against our 400 ms budget.

Before anyone asks: I am not averaging the four generators' percentiles. You
cannot average percentiles and get a percentile and I did not want that argument.
The figure above is the worst generator's p95, which is the conservative reading
and the one I will defend - worker-4 carried 1,250 of the 2,000 virtual users, so
it is the generator that pushed hardest, and it is the closest thing in this run
to peak November behaviour. The other three sat near 270 ms under a quarter of
the load each and are not the case we are provisioning for.

2,810 / 400 = 7.0. We cannot buy seven times the capacity. Storefront runs 6 pods
today; +6 doubles it, which is the affordable step and moves the tail in the
right direction. No errors were recorded anywhere in the run, so this is purely a
latency problem and purely a capacity problem.

## Evidence

- `results/worker-{1..4}_stats.csv`
- `scripts/aggregate.mjs` output: `run p95 2810.0ms against a 400ms budget: FAIL`

=============== FILE: scripts/run-load.sh ===============
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

=============== FILE: load/locustfile.py ===============
from locust import HttpUser, task, constant

TOKEN = "eyJhbGciOiJIUzI1NiJ9.loadtest-shared-account.9f2a1c"


class Shopper(HttpUser):
    wait_time = constant(0)

    @task
    def product_page(self):
        self.client.get(
            "/api/products/4471",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

=============== FILE: results/worker-1_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/4471,41220,0,118,131.44,44,1204,8412,34.35,0.0,118,142,161,174,218,268,341,402,812,1108,1204
,Aggregated,41220,0,118,131.44,44,1204,8412,34.35,0.0,118,142,161,174,218,268,341,402,812,1108,1204

=============== FILE: results/worker-2_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/4471,41108,0,114,127.90,42,1161,8412,34.26,0.0,114,138,156,169,211,255,329,388,776,1042,1161
,Aggregated,41108,0,114,127.90,42,1161,8412,34.26,0.0,114,138,156,169,211,255,329,388,776,1042,1161

=============== FILE: results/worker-3_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/4471,40984,0,121,136.02,45,1288,8412,34.15,0.0,121,147,167,181,228,281,358,421,864,1190,1288
,Aggregated,40984,0,121,136.02,45,1288,8412,34.15,0.0,121,147,167,181,228,281,358,421,864,1190,1288

=============== FILE: results/worker-4_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/4471,6180,0,1180,1402.77,51,9440,8412,5.15,0.0,1180,1488,1702,1844,2311,2810,4102,5188,8104,9302,9440
,Aggregated,6180,0,1180,1402.77,51,9440,8412,5.15,0.0,1180,1488,1702,1844,2311,2810,4102,5188,8104,9302,9440

=============== FILE: scripts/aggregate.mjs ===============
import { readFileSync } from 'node:fs';

export const P95_BUDGET_MS = 400;

export function parseStats(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
}

export function workerP95(csv) {
  const aggregated = parseStats(csv).find((r) => r.Name === 'Aggregated');
  return Number(aggregated['95%']);
}

export function runP95(csvs) {
  return Math.max(...csvs.map(workerP95));
}

const files = process.argv.slice(2);
if (files.length) {
  const p95 = runP95(files.map((f) => readFileSync(f, 'utf8')));
  const pass = p95 < P95_BUDGET_MS;
  console.log(`run p95 ${p95.toFixed(1)}ms against a ${P95_BUDGET_MS}ms budget: ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}

=============== FILE: test/aggregate.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workerP95, runP95 } from '../scripts/aggregate.mjs';

const read = (n) =>
  readFileSync(new URL(`../results/worker-${n}_stats.csv`, import.meta.url), 'utf8');
const all = [1, 2, 3, 4].map(read);

test('a worker p95 is read off its Aggregated row', () => {
  assert.equal(workerP95(all[0]), 268);
  assert.equal(workerP95(all[3]), 2810);
});

test('the readiness run reports 2810ms', () => {
  assert.equal(runP95(all), 2810);
});

=============== FILE: package.json ===============
{
  "name": "northfield-readiness",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: logs/run-notes.md ===============
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
