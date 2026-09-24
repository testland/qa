# Sign-off needed on CR-473 before Friday's freeze

## Problem Description

I am the engineering manager for Northfield storefront and I have a change request
on my desk that I have to approve or reject before the infrastructure freeze closes
on Friday 18th. It asks for six additional application pods for the November peak,
at about 4,100 a month, on the strength of Saturday's readiness run.

I want to approve it if it is right. Marcus has clearly thought about the
statistics - he goes out of his way in the request to explain what he is
deliberately not doing with them, and the thing he refuses to do is the thing I
would have objected to first. He has also been careful with the generators this
time: four separate boxes, one process on each, CPU well under half on all four,
after the mess we made of the September 6th attempt.

What nags at me is smaller and I cannot make it go away. Our production p95 on that
endpoint right now, at normal weekday traffic, is 240 ms on six pods. His run says
633. I have pulled the monitoring extract for the same endpoint and attached it,
because I cannot work out how to line those two numbers up, and until I can I do
not know whether 633 is telling me the storefront is in trouble or telling me
nothing at all.

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
2. Bring `scripts/aggregate.mjs` into line with what your review concludes.
   `node --test` must pass when you are finished; if a change of yours makes an
   existing expectation wrong, update that expectation rather than deleting the
   case.
3. Do not edit the CSVs, the run notes, or the monitoring extract.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/change-request-473.md ===============
# CR-473 - six additional storefront pods for November peak

Raised by: M. Ilves, 2026-09-14
Cost: EUR 4,112 / month (6 x c6i.xlarge equivalent)
Needed by: infrastructure freeze, 2026-09-18

## Justification

Saturday's readiness run drove 2,000 virtual shoppers against staging for 20
minutes from four separate generator boxes. November peak is about 500 concurrent
shoppers, so the run was roughly 4x peak. The run's p95 came out at **633.7 ms**
against our 400 ms budget.

Before anyone asks about the statistics: I know you cannot average percentiles and
get a percentile, and I have not done that. `aggregate.mjs` pools the four
generators' 95% columns weighted by the request count each one contributed, which
is the standard way to combine per-generator stats, and since the four boxes came
within 1% of each other on request count the weighting barely moves it anyway. It
is one number and I can defend how it was produced.

633.7 / 400 = 1.58. Storefront runs 6 pods today; +6 doubles it. Latency near
saturation is not linear, so the affordable step that actually moves the tail is
the doubling, not two or three pods.

No failures were recorded on any generator, so this is purely a latency problem and
purely a capacity problem.

## Evidence

- `results/worker-{1..4}_stats.csv`
- `scripts/aggregate.mjs` output: `run p95 633.7ms against a 400ms budget: FAIL`
- generator CPU stayed under 45% on all four boxes (see the run notes)

=============== FILE: scripts/run-load.sh ===============
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

=============== FILE: load/locustfile.py ===============
import random

from locust import HttpUser, task, between

PRODUCT_IDS = [line.strip() for line in open("load/product-ids.txt")]
ACCOUNTS = [line.strip() for line in open("load/accounts.txt")]


class Shopper(HttpUser):
    wait_time = between(2, 5)

    def on_start(self):
        self.token = random.choice(ACCOUNTS)

    @task
    def product_page(self):
        pid = random.choice(PRODUCT_IDS)
        self.client.get(
            f"/api/products/{pid}",
            name="/api/products/[id]",
            headers={"Authorization": f"Bearer {self.token}"},
        )

=============== FILE: results/worker-1_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/[id],148900,0,318,344.10,68,3104,8412,124.08,0.0,318,388,425,452,541,612,741,848,1502,2410,3104
,Aggregated,148900,0,318,344.10,68,3104,8412,124.08,0.0,318,388,425,452,541,612,741,848,1502,2410,3104

=============== FILE: results/worker-2_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/[id],149220,0,331,357.44,71,3260,8412,124.35,0.0,331,402,442,470,564,640,772,884,1561,2488,3260
,Aggregated,149220,0,331,357.44,71,3260,8412,124.35,0.0,331,402,442,470,564,640,772,884,1561,2488,3260

=============== FILE: results/worker-3_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/[id],147880,0,339,365.02,70,3341,8412,123.23,0.0,339,411,452,481,577,655,790,905,1598,2544,3341
,Aggregated,147880,0,339,365.02,70,3341,8412,123.23,0.0,339,411,452,481,577,655,790,905,1598,2544,3341

=============== FILE: results/worker-4_stats.csv ===============
Type,Name,Request Count,Failure Count,Median Response Time,Average Response Time,Min Response Time,Max Response Time,Average Content Size,Requests/s,Failures/s,50%,66%,75%,80%,90%,95%,98%,99%,99.9%,99.99%,100%
GET,/api/products/[id],149540,0,325,350.78,69,3188,8412,124.62,0.0,325,395,434,462,553,628,757,867,1534,2451,3188
,Aggregated,149540,0,325,350.78,69,3188,8412,124.62,0.0,325,395,434,462,553,628,757,867,1534,2451,3188

=============== FILE: scripts/aggregate.mjs ===============
import { readFileSync } from 'node:fs';

export const P95_BUDGET_MS = 400;

export function parseStats(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
}

function aggregatedRow(csv) {
  return parseStats(csv).find((r) => r.Name === 'Aggregated');
}

export function workerP95(csv) {
  return Number(aggregatedRow(csv)['95%']);
}

export function workerCount(csv) {
  return Number(aggregatedRow(csv)['Request Count']);
}

// pool the generators' 95% columns, weighted by what each one contributed
export function runP95(csvs) {
  const total = csvs.reduce((a, c) => a + workerCount(c), 0);
  return csvs.reduce((a, c) => a + workerP95(c) * workerCount(c), 0) / total;
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
import { workerP95, workerCount, runP95 } from '../scripts/aggregate.mjs';

const read = (n) =>
  readFileSync(new URL(`../results/worker-${n}_stats.csv`, import.meta.url), 'utf8');
const all = [1, 2, 3, 4].map(read);

test('a generator p95 is read off its Aggregated row', () => {
  assert.equal(workerP95(all[0]), 612);
  assert.equal(workerCount(all[0]), 148900);
});

test('the four generators pool to the run p95', () => {
  assert.equal(runP95(all).toFixed(1), '633.7');
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

=============== FILE: ops/monitoring-extract.md ===============
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
