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

Three people already have an answer and I do not trust any of them yet. Marek
on infra says it is obvious: the checkout response is a 24 kB JSON blob and we
have never turned on compression, so he wants the sprint spent on gzip and a
payload diet. Our staff engineer says the gate itself is the problem - that
95th-percentile numbers bounce around too much to be a useful signal and we
should switch the job to mean response time, which is stable and which he can
put on a dashboard for the leadership review. Sanjay has already opened a
branch: he says the job never prints the 99th percentile at all, so of course
it never catches anything, and his change prints it and fails the run at a
second and a half. He says that is what the tool's own documentation
recommends and that it would have caught this.

What I have is in the repo. `reports/nightly-summary.json` is what the job
exported on the night of the 10th. `data/checkout-histogram.csv` is what our
post-processing writes out of the raw stream: every checkout request of that
run, bucketed by response time in 25 ms steps. `data/checkout-phases.csv` is
the per-phase breakdown the same tooling keeps for every request over a second,
plus a random thirty from under it, with the offset into the run at which each
request was issued.

Two things I need. First, the leadership review is on Thursday and I have to
put a proportion in front of it - what share of checkouts this actually hits.
If the run agrees with the 38 out of 7,600 support have, that is the number I
will use, and I would like it confirmed. Second, I want the nightly job changed
so it goes red the next time this happens instead of nine weeks later in a
support queue, and whatever gate you put in, show me with the numbers that it
would have failed on the night of the 10th. I have had enough of gates that
pass.

`lib/csv.mjs` already reads these files; there is a test for it that passes.

## Output Specification

1. `scripts/analyze-latency.mjs` - reads the supplied data and writes
   `reports/latency-analysis.json` carrying the numbers your conclusion
   actually rests on. Run it and leave the output file in the repo.
2. `test/analyze-latency.test.mjs` - tests for whatever that script computes,
   running under `npm test` next to the test already in the repo. `npm test`
   must be green when you are done.
3. `reports/checkout-latency.md` - what is happening, where in the request the
   time goes, a straight answer on each of the three proposals, the answer on
   the proportion I asked for, and the demonstration that your new gate would
   have failed the run of the 10th.
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
        "avg": 153.2,
        "min": 52,
        "med": 113,
        "max": 2644,
        "p(90)": 262,
        "p(95)": 337
      },
      "thresholds": {
        "p(95)<500": { "ok": true }
      }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": {
        "avg": 147.1,
        "min": 45.8,
        "med": 107.4,
        "max": 2636,
        "p(90)": 255.4,
        "p(95)": 330.6
      }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1.7, "min": 0.4, "med": 1.7, "max": 2.9, "p(90)": 2.7, "p(95)": 2.8 }
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
      "values": { "avg": 1154.4, "min": 1053, "med": 1114, "max": 3645, "p(90)": 1263, "p(95)": 1338 }
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
1050,1075,1
1125,1150,1
1225,1250,1
1350,1375,1
1425,1450,1
1500,1525,1
1575,1600,1
1650,1675,1
1725,1750,1
1800,1825,1
1875,1900,1
1950,1975,1
2000,2025,1
2075,2100,1
2125,2150,1
2175,2200,1
2225,2250,1
2275,2300,1
2325,2350,2
2375,2400,2
2425,2450,2
2475,2500,2
2525,2550,2
2575,2600,1
2625,2650,1

=============== FILE: data/checkout-phases.csv ===============
start_s,duration_ms,blocked_ms,sending_ms,waiting_ms,receiving_ms,resp_bytes,status
20.8,68,2.4,0.4,58.2,7,24450,200
39.2,74,2.6,0.3,67.1,4,24769,200
59.5,80,2.6,0.2,73.6,3.6,24406,200
76.3,88,0.8,0.4,80.3,6.5,24311,200
97.3,95,1.2,0.2,88.2,5.4,24678,200
117.8,102,2.7,0.2,93.3,5.8,24207,200
127.3,2479,0.6,0.4,2471.2,6.8,24828,200
127.4,2331,2.8,0.1,2324,4.1,24127,200
127.7,2016,0.6,0.6,2011.6,3.2,24274,200
128.1,1588,2,0.4,1579.1,6.5,24923,200
128.5,1063,1.8,0.2,1056.1,4.9,24988,200
136.9,110,1.3,0.3,102.6,5.8,24199,200
156.3,117,1.4,0.2,110,5.4,24525,200
174.9,124,2.7,0.3,113.7,7.3,24166,200
194.4,129,2.1,0.2,121.3,5.4,24790,200
211.9,2494,0.5,0.3,2490.2,3,24692,200
212,2344,2.5,0.5,2334.6,6.4,24768,200
212.3,2084,0.8,0.1,2077.3,5.8,24764,200
212.6,1664,0.9,0.5,1660.1,2.5,24822,200
213.1,1141,2.2,0.1,1133.4,5.3,24546,200
213.8,136,0.6,0.5,130.2,4.7,24490,200
233.9,142,2.3,0.2,132.6,6.9,24392,200
251.1,149,1,0.1,141.7,6.2,24789,200
271.9,155,0.5,0.3,147.7,6.5,24499,200
290.1,164,1,0.2,157.4,5.4,24623,200
296.5,2531,1.4,0.4,2525.8,3.4,24177,200
296.7,2379,1.8,0.3,2371.1,5.8,24628,200
296.9,2139,1.8,0.3,2133.2,3.7,24856,200
297.2,1736,2.5,0.4,1729.9,3.2,24515,200
297.7,1238,1.3,0.2,1230.3,6.2,24381,200
309.9,171,2.1,0.2,162,6.7,24198,200
331.4,177,0.8,0.2,173.2,2.8,24721,200
349.1,184,2.1,0.1,179.2,2.6,24100,200
367.6,194,1.7,0.1,184.9,7.3,24381,200
381.1,2546,1.9,0.4,2540.3,3.4,24272,200
381.2,2392,2.6,0.2,2384.6,4.6,24454,200
381.4,2186,0.7,0.5,2179.6,5.2,24655,200
381.7,1811,1.5,0.1,1803.3,6.1,24282,200
382.2,1362,1.8,0.4,1355.3,4.5,24365,200
387.1,208,1,0.3,202,4.7,24561,200
408.9,213,2.2,0.4,207.3,3.1,24354,200
427.8,227,2.3,0.3,221.7,2.7,24753,200
447,241,0.6,0.2,236.3,3.9,24298,200
465,254,2,0.4,244.9,6.7,24586,200
465.7,2588,1.5,0.2,2580,6.3,24359,200
465.8,2428,1.8,0.1,2419.5,6.6,24718,200
466,2241,1,0.2,2233.4,6.4,24354,200
466.3,1888,2.2,0.3,1881.5,4,24558,200
466.7,1441,1.9,0.1,1435.4,3.6,24799,200
486.2,266,1.7,0.2,258.5,5.6,24561,200
504.6,281,2.4,0.6,272.5,5.5,24720,200
525,292,1.3,0.6,285.3,4.8,24889,200
544.7,311,2.7,0.5,302.7,5.1,24133,200
550.3,2644,1.6,0.3,2636,6.1,24555,200
550.5,2441,2.1,0.6,2434.8,3.5,24304,200
550.6,2288,1.1,0.4,2281.3,5.2,24908,200
550.9,1957,0.4,0.3,1953.6,2.7,24991,200
551.3,1509,0.9,0.3,1501.7,6.1,24427,200
563.3,327,0.7,0.4,323.4,2.5,24959,200
580.6,334,2.5,0.5,328.5,2.5,24494,200
