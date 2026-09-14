# Six months of a green performance gate, then Saturday

## Problem Description

Saturday 12 September at 19:20 the orders service fell over during the promo
window. Submit latency went to seconds, then the pods started restarting, and
we were down for most of half an hour. The incident note is in the repo with
what the edge actually recorded that evening.

The part I have to explain on Tuesday is that the performance gate on this repo
has been green on every pull request and every merge since March. Not
"occasionally red" - never red, not once. And it is not a gate somebody
skipped: it runs the profile the March sign-off asked for, at the concurrency
the March sign-off asked for, on every single merge.

In the repo you have the gate as it stands - the workflow, the script it runs,
and `artifacts/k6.log`, which is the console output the last run on main wrote
before Saturday. `docs/nfr.md` is the capacity sign-off the three teams agreed
in March and `docs/incident-2026-09-12.md` is Saturday.

Our platform lead has already sent round the fix he wants: tighten the latency
threshold in the script to match the sign-off and we are covered. I would like
that to be true and I do not think it is, because I do not yet understand how a
run that produced the numbers in that log could have caught anything. I would
rather find that out now than in front of the VP.

`lib/k6-log.mjs` reads the console output already - one of our engineers wrote
it last year for a dashboard experiment and there is a test for it that passes.

## Output Specification

1. `docs/why-the-gate-was-green.md` - the explanation for Tuesday. Every reason
   that run was reported as a pass, each one pinned to what in the log, the
   config or the sign-off shows it, and what changes for each. Deal with the
   platform lead's proposal directly.
2. `scripts/check-run-shape.mjs` - a check I can put in the pipeline that reads
   `artifacts/k6.log` and fails when the run that produced it was not the run
   we need it to be. Run it against the supplied log and leave its output in
   `reports/run-shape.json`. It must exit non-zero on that log.
3. `test/check-run-shape.test.mjs` - tests for it, running under `npm test`
   next to the test already in the repo. `npm test` must be green.
4. `.github/workflows/perf.yml` and `tests/load/orders.js` - changed so that a
   Saturday like this one goes red in CI first.

Do not edit `artifacts/k6.log`, `docs/nfr.md`, `docs/incident-2026-09-12.md`,
`lib/k6-log.mjs` or `test/k6-log.test.mjs`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-perf-gate",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/nfr.md ===============
# Capacity sign-off - orders submit path (2026-03-18)

Agreed by platform, orders and SRE. Superseded only by a new sign-off.

| Budget                        | Value                                  |
|-------------------------------|----------------------------------------|
| Submit latency, 95th          | 600 ms or less                         |
| Submit latency, 99th          | 1500 ms or less                        |
| Error rate                    | under 0.5%                             |
| Load to be held               | 300 concurrent users, 10 minutes       |

The promo windows are the reason for the 300 figure; outside them we sit around
60-90 concurrent users.

=============== FILE: docs/incident-2026-09-12.md ===============
# Incident 2026-09-12 - orders submit unavailable 19:20-19:48 UTC

**Impact.** Order submission failed or timed out for 28 minutes during the
autumn promo window. 4,880 submissions lost.

**What the edge recorded.** The promo email landed at 19:02. From 19:06 the
edge sustained between 870 and 940 requests per second against
`POST /api/orders`, peaking at 1,050/s at 19:19, and held above 850/s until
19:44. Submit latency at the edge was under 400 ms until 19:17, crossed two
seconds at 19:19, and the first pod restart was at 19:22.

**What we had been measuring.** The performance gate on the orders repo, green
since March.

=============== FILE: .github/workflows/perf.yml ===============
name: perf

on:
  pull_request:
  push:
    branches: [main]

jobs:
  k6:
    runs-on: [self-hosted, load-runner]
    steps:
      - uses: actions/checkout@v5

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run the load test
        env:
          API_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
        run: |
          mkdir -p artifacts
          set -o pipefail
          k6 run tests/load/orders.js | tee artifacts/k6.log

      - name: Upload console output
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-log
          path: artifacts/k6.log

=============== FILE: tests/load/orders.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m',  target: 300 },
    { duration: '10m', target: 300 },
    { duration: '2m',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed:   ['rate<0.25'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.post(
    `${BASE}/api/orders`,
    JSON.stringify({ sku: 'SKU-1', qty: 1 }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'order accepted': (r) => r.status === 201 });
  sleep(1);
}

=============== FILE: artifacts/k6.log ===============
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: tests/load/orders.js
        output: -

     scenarios: (100.00%) 1 scenario, 300 max VUs, 17m30s max duration (incl. graceful stop):
              * default: Up to 300 looping VUs for 17m0s over 3 stages (gracefulRampDown: 30s, gracefulStop: 30s)


     ✓ order accepted

     checks.........................: 99.69% ✓ 190293    ✗ 591
     data_received..................: 2.1 GB  2.1 MB/s
     data_sent......................: 61 MB   60 kB/s
     http_req_blocked...............: avg=1.14ms min=1µs    med=2µs    max=284ms  p(90)=3µs    p(95)=5µs
     http_req_connecting............: avg=0.81ms min=0s     med=0s     max=198ms  p(90)=0s     p(95)=0s
   ✓ http_req_duration..............: avg=268ms  min=38ms   med=214ms  max=5.9s   p(90)=392ms  p(95)=480ms
   ✓ http_req_failed................: 0.31%  ✓ 591       ✗ 190293
     http_req_receiving.............: avg=2.1ms  min=39µs   med=1.7ms  max=79ms   p(90)=3.8ms  p(95)=4.9ms
     http_req_sending...............: avg=106µs  min=15µs   med=88µs   max=11ms   p(90)=188µs  p(95)=264µs
     http_req_tls_handshaking.......: avg=0s     min=0s     med=0s     max=0s     p(90)=0s     p(95)=0s
     http_req_waiting...............: avg=266ms  min=37ms   med=212ms  max=5.9s   p(90)=390ms  p(95)=478ms
     http_reqs......................: 190884 187.14/s
     iteration_duration.............: avg=1.27s  min=1.04s  med=1.21s  max=6.91s  p(90)=1.39s  p(95)=1.48s
     iterations.....................: 190884 187.14/s
     vus............................: 1      min=1       max=300
     vus_max........................: 300    min=300     max=300

running (17m00.4s), 000/300 VUs, 190884 complete and 0 interrupted iterations

=============== FILE: lib/k6-log.mjs ===============
const UNIT_MS = { h: 3600000, m: 60000, s: 1000, ms: 1, 'µs': 0.001, us: 0.001, ns: 0.000001 };

const METRIC_LINE = /^\s*(✓|✗)?\s*([a-z0-9_]+)\.{2,}:\s*(.*)$/;
const RUNNING_LINE =
  /^running \((.+?)\),\s*(\d+)\/(\d+) VUs,\s*(\d+) complete and (\d+) interrupted iterations/;

export function toMs(text) {
  const parts = String(text ?? '').match(/(\d+(?:\.\d+)?)(h|ms|µs|us|ns|m|s)/g);
  if (!parts) return NaN;
  let total = 0;
  for (const part of parts) {
    const [, n, unit] = /^(\d+(?:\.\d+)?)(h|ms|µs|us|ns|m|s)$/.exec(part);
    total += Number(n) * UNIT_MS[unit];
  }
  return total;
}

export function parseSummary(text) {
  const metrics = {};
  let running = null;

  for (const line of String(text).split('\n')) {
    const r = RUNNING_LINE.exec(line.trim());
    if (r) {
      running = {
        duration: r[1],
        durationMs: toMs(r[1]),
        activeVus: Number(r[2]),
        maxVus: Number(r[3]),
        complete: Number(r[4]),
        interrupted: Number(r[5]),
      };
      continue;
    }
    const m = METRIC_LINE.exec(line);
    if (!m) continue;
    const values = {};
    for (const token of m[3].trim().split(/\s+/)) {
      const kv = /^([a-z0-9()._]+)=(.+)$/i.exec(token);
      if (kv) values[kv[1]] = kv[2];
    }
    metrics[m[2]] = { mark: m[1] ?? null, raw: m[3].trim(), values };
  }

  return { metrics, running };
}

=============== FILE: test/k6-log.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSummary, toMs } from '../lib/k6-log.mjs';

const SAMPLE = [
  '   ✓ http_req_duration..............: avg=210ms  min=90ms   med=180ms  max=2s     p(90)=390ms  p(95)=480ms',
  '     http_reqs......................: 1200   40.00/s',
  '     vus_max........................: 25     min=25      max=25',
  '',
  'running (0m30.1s), 00/25 VUs, 1200 complete and 0 interrupted iterations',
].join('\n');

test('reads metric lines, their threshold mark and their values', () => {
  const { metrics } = parseSummary(SAMPLE);
  assert.equal(metrics.http_req_duration.mark, '✓');
  assert.equal(metrics.http_req_duration.values['p(95)'], '480ms');
  assert.equal(metrics.vus_max.values.max, '25');
  assert.equal(metrics.http_reqs.raw, '1200   40.00/s');
});

test('reads the trailing run line', () => {
  const { running } = parseSummary(SAMPLE);
  assert.equal(running.maxVus, 25);
  assert.equal(running.complete, 1200);
  assert.equal(running.durationMs, 30100);
});

test('converts k6 duration strings to milliseconds', () => {
  assert.equal(toMs('6.83s'), 6830);
  assert.equal(toMs('142ms'), 142);
  assert.equal(toMs('3m00.2s'), 180200);
  assert.equal(toMs('0s'), 0);
});
