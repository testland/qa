# The nightly performance job is green and checkout is not

## Problem Description

Our nightly job runs against staging at 02:00 and has passed every night for
nine weeks. The gate is 95% of checkout requests under 500 ms and under 1%
errors, and it has never once gone red.

Support does not agree with it. In the week of 1 September they logged 38
tickets against checkout out of roughly 7,600 attempts, all of them saying the
same thing: the confirm button sits there for a couple of seconds and then
works. Nobody has reproduced it on demand. Nothing errored - every one of those
carts eventually went through.

Two people already have an answer and I do not trust either of them yet. Marek
on infra says it is obvious: the checkout response is a 24 kB JSON blob and we
have never turned on compression, so he wants the sprint spent on gzip and a
payload diet. Our staff engineer says the gate itself is the problem - that
95th-percentile numbers bounce around too much to be a useful signal and we
should switch the job to mean response time, which is stable and which he can
put on a dashboard for the leadership review.

What I have is in the repo. `reports/nightly-summary.json` is what the job
exported on the night of the 10th. `data/checkout-histogram.csv` is what our
post-processing writes out of the raw stream: every checkout request of that
run, bucketed by response time in 25 ms steps. `data/checkout-phases.csv` is
the per-phase breakdown the same tooling keeps for every request over a second,
plus a random thirty from under it.

I want to know whether there is anything real in that data before I let anyone
spend a sprint on it, and if there is, I want the nightly job changed so it
goes red the next time it happens instead of nine weeks later in a support
queue. Whatever gate you put in, show me with the numbers that it would have
failed on the night of the 10th - I have had enough of gates that pass.

`lib/csv.mjs` already reads these files; there is a test for it that passes.

## Output Specification

1. `scripts/analyze-latency.mjs` - reads the supplied data and writes
   `reports/latency-analysis.json` carrying the numbers your conclusion
   actually rests on. Run it and leave the output file in the repo.
2. `test/analyze-latency.test.mjs` - tests for whatever that script computes,
   running under `npm test` next to the test already in the repo. `npm test`
   must be green when you are done.
3. `reports/checkout-latency.md` - what is happening, how many requests it
   affects, where in the request the time goes, a straight answer on Marek's
   compression plan and on the dashboard change, and the demonstration that
   your new gate would have failed the run of the 10th.
4. `tests/load/checkout.js` - changed so a run like the 10th would not pass.

Do not edit anything under `data/`, do not change `lib/csv.mjs` or
`test/csv.test.mjs`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront-perf",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/csv.mjs ===============
export function parseCsv(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((key, i) => {
      const raw = cells[i];
      const num = Number(raw);
      row[key] = raw !== '' && !Number.isNaN(num) ? num : raw;
    });
    return row;
  });
}

=============== FILE: test/csv.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../lib/csv.mjs';

test('parses a header and numeric cells', () => {
  const rows = parseCsv('a,b\n1,x\n2.5,y\n');
  assert.deepEqual(rows, [
    { a: 1, b: 'x' },
    { a: 2.5, b: 'y' },
  ]);
});

test('ignores blank trailing lines', () => {
  assert.equal(parseCsv('a\n1\n\n\n').length, 1);
});

=============== FILE: tests/load/checkout.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 12 },
    { duration: '8m', target: 12 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'checkout accepted': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'reports/nightly-summary.json': JSON.stringify(data, null, 2) };
}

=============== FILE: reports/nightly-summary.json ===============
{
  "run": {
    "started": "2026-09-10T02:00:04Z",
    "duration_s": 600,
    "script": "tests/load/checkout.js",
    "exit_code": 0
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": {
        "avg": 154.7,
        "min": 52,
        "med": 116,
        "max": 2644,
        "p(90)": 262,
        "p(95)": 330
      },
      "thresholds": {
        "p(95)<500": { "ok": true }
      }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": {
        "avg": 148.4,
        "min": 45.8,
        "med": 110.1,
        "max": 2638.3,
        "p(90)": 255.9,
        "p(95)": 323.6
      }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1.7, "min": 0.5, "med": 1.7, "max": 2.9, "p(90)": 2.7, "p(95)": 2.8 }
    },
    "http_req_sending": {
      "type": "trend",
      "values": { "avg": 0.3, "min": 0.1, "med": 0.3, "max": 0.6, "p(90)": 0.5, "p(95)": 0.6 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 4.8, "min": 2.3, "med": 4.8, "max": 7.4, "p(90)": 7, "p(95)": 7.2 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0, "passes": 0, "fails": 6002 },
      "thresholds": {
        "rate<0.01": { "ok": true }
      }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 1, "passes": 6002, "fails": 0 }
    },
    "http_reqs": {
      "type": "counter",
      "values": { "count": 6002, "rate": 10.003 }
    },
    "iterations": {
      "type": "counter",
      "values": { "count": 6002, "rate": 10.003 }
    },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 1155.9, "min": 1053, "med": 1117, "max": 3645, "p(90)": 1263, "p(95)": 1331 }
    },
    "vus_max": {
      "type": "gauge",
      "values": { "value": 12, "min": 12, "max": 12 }
    }
  }
}

=============== FILE: data/checkout-histogram.csv ===============
bucket_start_ms,bucket_end_ms,requests
50,75,1151
75,100,1287
100,125,842
125,150,695
150,175,490
175,200,369
200,225,292
225,250,196
250,275,156
275,300,108
300,325,86
325,350,83
350,375,50
375,400,29
400,425,28
425,450,17
450,475,15
475,500,14
500,525,14
525,550,15
550,575,10
575,600,2
600,625,8
625,650,3
650,675,2
675,700,2
700,725,2
725,750,2
750,775,3
775,800,1
2175,2200,1
2225,2250,2
2250,2275,1
2275,2300,2
2300,2325,2
2325,2350,1
2350,2375,2
2375,2400,3
2400,2425,1
2425,2450,1
2450,2475,2
2475,2500,1
2500,2525,3
2525,2550,2
2550,2575,5
2625,2650,1

=============== FILE: data/checkout-phases.csv ===============
t_offset_s,duration_ms,blocked_ms,sending_ms,waiting_ms,receiving_ms,resp_bytes,status
127,2345,2.5,0.1,2340.1,4.8,24403,200
129,2594,1,0.2,2590.9,2.9,24102,200
129,2264,1.4,0.6,2256.4,7,24574,200
134,2197,1.3,0.6,2194.1,2.3,24858,200
140,2378,2.5,0.2,2375.1,2.7,24675,200
146,184,2.5,0.5,176.8,6.7,24662,200
151,80,2.3,0.3,75.7,4,24521,200
153,68,2.8,0.5,62.9,4.6,24975,200
153,165,1.4,0.4,159.1,5.5,24477,200
166,2339,1.3,0.2,2333.7,5.1,24958,200
167,2514,2.2,0.3,2508.6,5.1,24743,200
181,241,1.4,0.5,238.1,2.4,24861,200
209,2646,1.3,0.4,2640.6,5,24506,200
214,334,2,0.4,329,4.6,24426,200
216,2454,1,0.3,2450.2,3.5,24415,200
220,2229,1.7,0.3,2224.6,4.1,24903,200
228,2586,0.5,0.4,2579.5,6.1,24575,200
231,177,1.7,0.2,174.5,2.3,24333,200
247,2397,1.1,0.2,2389.7,7.1,24492,200
257,231,0.9,0.6,227,3.4,24693,200
264,136,0.6,0.4,132.7,2.9,24677,200
267,327,0.9,0.2,323.4,3.4,24904,200
283,2543,0.7,0.3,2536.4,6.3,24695,200
293,298,2,0.3,292.8,4.9,24757,200
295,129,2.8,0.3,122.5,6.2,24487,200
296,2561,2.9,0.2,2554.5,6.3,24726,200
314,2414,1.9,0.4,2410.9,2.7,24136,200
314,311,0.5,0.1,307.8,3.1,24532,200
338,2489,2.5,0.2,2484.7,4.1,24110,200
340,2302,2.5,0.3,2295.8,5.9,24845,200
349,2579,2.2,0.2,2575.8,3,24530,200
356,316,2.5,0.5,308.9,6.6,24214,200
367,2488,0.5,0.3,2480.7,7,24711,200
368,2262,2.6,0.5,2255.4,6.1,24227,200
379,102,1.9,0.1,94.6,7.3,24609,200
381,2628,2.6,0.5,2620.9,6.6,24578,200
382,2450,2.2,0.2,2446.7,3.1,24620,200
408,286,0.5,0.4,279.3,6.3,24406,200
421,292,2.4,0.2,288.6,3.2,24207,200
424,2450,2.6,0.6,2446.2,3.2,24228,200
431,2475,1.5,0.2,2469.6,5.2,24512,200
433,74,1.4,0.4,69.1,4.5,24134,200
446,2590,2.2,0.2,2584.1,5.7,24829,200
456,95,1.5,0.5,90,4.5,24490,200
456,142,1.3,0.4,137.6,4,24127,200
460,331,2.1,0.5,325.9,4.6,24353,200
468,213,1.8,0.1,208.1,4.8,24791,200
469,214,0.5,0.5,207.9,5.6,24516,200
470,2409,2.6,0.3,2405.5,3.2,24373,200
474,2225,1.6,0.2,2217.7,7.1,24507,200
478,2320,2.7,0.6,2313.1,6.3,24603,200
479,149,1.3,0.2,141.4,7.4,24762,200
486,88,2.7,0.3,84.5,3.2,24925,200
502,2525,2.7,0.5,2520.5,4,24330,200
505,288,0.6,0.2,280.9,6.9,24435,200
538,155,2.9,0.2,152.3,2.5,24588,200
543,260,2.7,0.1,254.3,5.6,24599,200
556,194,1.9,0.4,188.8,4.8,24170,200
557,2532,1.1,0.4,2527.7,3.9,24296,200
563,329,1.7,0.3,326.3,2.4,24959,200
