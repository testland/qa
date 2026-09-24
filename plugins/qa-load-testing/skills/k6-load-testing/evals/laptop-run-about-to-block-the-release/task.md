# Release call at 11:00 and two people telling me opposite things

## Problem Description

We cut 4.2 on Tuesday. I have to give the go/no-go at 11:00 and I have two
engineers in the release channel telling me opposite things, each with a number
attached.

Tomás ran the load script against staging last night and posted the summary at
23:40 with "p95 is 3.2 seconds, we cannot ship this". He wants a Sev-2 opened
against the API team before anyone goes home. His export is
`runs/laptop-summary.json`; he ran it from his own machine at 800 users for 45
minutes, which is more load than the scheduled job puts on, and he says that is
exactly the point, because the promo on Friday will put more than that through
it.

Priya leads the API team. Her position is that the scheduled job is our gate,
it has run every night at 01:00 for eleven weeks against the same environment,
and it has been green every single night including last night. Her words: "we
wrote a threshold for every line of the sign-off in June, the job checks all
four of them every night, and it has never once complained." Last night's
export is `runs/ci-nightly-summary.json` and the job that produced it is in
`.github/workflows/`.

I am inclined to agree with Priya unless somebody shows me otherwise, because
one engineer's ad-hoc run against eleven weeks of a green gate is not a case.
What I need by 11:00 is which of those two numbers I am allowed to repeat to
the VP, whether anything in what we have actually blocks 4.2, and if it does,
what has to be true before it ships. `docs/perf-nfr.md` is the budget document
the three of us signed off in June.

## Output Specification

1. `docs/release-call.md` - the go/no-go. Answer Tomás and Priya separately,
   say what each run actually measured, name the numbers you used, and state
   what has to be true before 4.2 ships.
2. `tests/load/checkout.js` - whatever needs changing for the scheduled job to
   be a gate I can rely on. Say in the call document what each change is for.
3. `docs/load-run-checklist.md` - the short list of what has to hold before a
   number out of a load run gets repeated as a statement about the product.

Do not edit anything under `runs/` or `docs/perf-nfr.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/perf-nfr.md ===============
# Release budgets - signed 2026-06-04

Owners: Priya (API), Tomás (storefront), release management.

| Measure                                        | Budget                     |
|------------------------------------------------|----------------------------|
| `/api/checkout`, 95th percentile response time | under 800 ms               |
| `/api/checkout`, HTTP error rate               | under 2%                   |
| `/api/checkout`, orders reaching `confirmed`   | at least 99.5%             |
| `/api/checkout`, load the gate must sustain    | 150 requests/second, 20 min |

A release does not ship while a signed budget is breached. Changing a budget
needs all three owners; it is not a release-day decision.

=============== FILE: tests/load/checkout.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const confirmedOrders = new Counter('confirmed_orders');

export const options = {
  stages: [
    { duration: '5m',  target: 200 },
    { duration: '20m', target: 200 },
    { duration: '5m',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed:   ['rate<0.02'],
    // PS 2026-06-04: the 99.5% confirmed floor from the sign-off.
    confirmed_orders:  ['rate>0.995'],
    // PS 2026-06-04: the 150/s the sign-off asks the gate to sustain.
    http_reqs:         ['rate>150'],
  },
};

const BASE = __ENV.API_BASE_URL;
const TOKEN = __ENV.API_TOKEN;

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    },
  );
  const confirmed = res.json('state') === 'confirmed';
  if (confirmed) confirmedOrders.add(1);
  check(res, { 'order reached confirmed': () => confirmed });
  sleep(1);
}

=============== FILE: .github/workflows/nightly-load.yml ===============
name: nightly-load

on:
  schedule:
    - cron: '0 1 * * *'
  workflow_dispatch:

jobs:
  load:
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

      - name: Run the scheduled load test
        env:
          API_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: >
          k6 run --vus 200 --duration 30m
          --summary-export=runs/ci-nightly-summary.json tests/load/checkout.js

      - name: Upload the summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nightly-summary
          path: runs/ci-nightly-summary.json

=============== FILE: runs/ci-nightly-summary.json ===============
{
  "run": {
    "host": "load-runner-02",
    "command": "k6 run --vus 200 --duration 30m --summary-export=runs/ci-nightly-summary.json tests/load/checkout.js",
    "started": "2026-09-10T01:00:03Z",
    "duration_s": 1800,
    "exit_code": 0
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": { "avg": 163, "min": 41, "med": 138, "max": 6120, "p(90)": 240, "p(95)": 302 },
      "thresholds": { "p(95)<800": { "ok": true } }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": { "avg": 156, "min": 38, "med": 132, "max": 6098, "p(90)": 232, "p(95)": 294 }
    },
    "http_req_sending": {
      "type": "trend",
      "values": { "avg": 0.4, "min": 0.1, "med": 0.3, "max": 14, "p(90)": 0.7, "p(95)": 0.9 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 6.2, "min": 0.9, "med": 5.1, "max": 84, "p(90)": 9.8, "p(95)": 12.4 }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 2.1, "min": 0.5, "med": 1.8, "max": 46, "p(90)": 3.4, "p(95)": 4.2 }
    },
    "http_req_connecting": {
      "type": "trend",
      "values": { "avg": 0.6, "min": 0, "med": 0, "max": 31, "p(90)": 1.9, "p(95)": 2.6 }
    },
    "http_req_tls_handshaking": {
      "type": "trend",
      "values": { "avg": 0.3, "min": 0, "med": 0, "max": 22, "p(90)": 0, "p(95)": 1.4 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.0011, "passes": 340, "fails": 308774 },
      "thresholds": { "rate<0.02": { "ok": true } }
    },
    "confirmed_orders": {
      "type": "counter",
      "values": { "count": 296412, "rate": 164.67 },
      "thresholds": { "rate>0.995": { "ok": true } }
    },
    "http_reqs": {
      "type": "counter",
      "values": { "count": 309114, "rate": 171.73 },
      "thresholds": { "rate>150": { "ok": true } }
    },
    "iterations": { "type": "counter", "values": { "count": 309114, "rate": 171.73 } },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 1163, "min": 1041, "med": 1138, "max": 7124, "p(90)": 1241, "p(95)": 1303 }
    },
    "checks": { "type": "rate", "values": { "rate": 0.9589, "passes": 296412, "fails": 12702 } },
    "vus": { "type": "gauge", "values": { "value": 200, "min": 200, "max": 200 } },
    "vus_max": { "type": "gauge", "values": { "value": 200, "min": 200, "max": 200 } }
  }
}

=============== FILE: runs/laptop-summary.json ===============
{
  "run": {
    "host": "tomas-mbp-16",
    "command": "k6 run --vus 800 --duration 45m tests/load/checkout.js",
    "started": "2026-09-09T22:55:04Z",
    "duration_s": 2700,
    "exit_code": 99
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": { "avg": 2401, "min": 61, "med": 1920, "max": 31240, "p(90)": 2905, "p(95)": 3182 },
      "thresholds": { "p(95)<800": { "ok": false } }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": { "avg": 219, "min": 48, "med": 162, "max": 4380, "p(90)": 288, "p(95)": 311 }
    },
    "http_req_sending": {
      "type": "trend",
      "values": { "avg": 34, "min": 0.2, "med": 11, "max": 1980, "p(90)": 78, "p(95)": 96 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 2148, "min": 1.2, "med": 1702, "max": 29800, "p(90)": 2610, "p(95)": 2861 }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1892, "min": 0.9, "med": 1240, "max": 22410, "p(90)": 5100, "p(95)": 6120 }
    },
    "http_req_connecting": {
      "type": "trend",
      "values": { "avg": 1204, "min": 0, "med": 890, "max": 18400, "p(90)": 3710, "p(95)": 4390 }
    },
    "http_req_tls_handshaking": {
      "type": "trend",
      "values": { "avg": 611, "min": 0, "med": 420, "max": 9100, "p(90)": 1640, "p(95)": 1980 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.0119, "passes": 3625, "fails": 301043 },
      "thresholds": { "rate<0.02": { "ok": true } }
    },
    "confirmed_orders": {
      "type": "counter",
      "values": { "count": 291599, "rate": 108 },
      "thresholds": { "rate>0.995": { "ok": true } }
    },
    "http_reqs": {
      "type": "counter",
      "values": { "count": 304668, "rate": 112.84 },
      "thresholds": { "rate>150": { "ok": false } }
    },
    "iterations": { "type": "counter", "values": { "count": 304668, "rate": 112.84 } },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 7089, "min": 1064, "med": 6480, "max": 52100, "p(90)": 11200, "p(95)": 13400 }
    },
    "checks": { "type": "rate", "values": { "rate": 0.9571, "passes": 291599, "fails": 13069 } },
    "vus": { "type": "gauge", "values": { "value": 800, "min": 800, "max": 800 } },
    "vus_max": { "type": "gauge", "values": { "value": 800, "min": 800, "max": 800 } }
  }
}
