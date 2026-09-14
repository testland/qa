# A throughput number that goes into a signed contract

## Problem Description

Halvorsen's procurement team wants a written performance commitment attached to
the MSA before they sign, and legal needs the final wording from me by
Thursday. Whatever goes into that schedule is contractual - if we miss it in
production there are service credits attached to it.

Marco drafted `docs/capacity-statement.md` from the run he did against
pre-production on Monday 8 September. There are three sentences in that draft
and legal will lift them verbatim. The export from Monday is in `runs/`,
alongside the export from an earlier run of the same script on 25 August, and
the script that produced both is in `tests/load/`.

Marco's covering note is at the bottom of the draft and you should read it,
because he has already anticipated the one thing he thinks somebody will raise
and he has a fix scheduled for Friday. His position is that Monday's run stands
on its own: both configured thresholds came back ok, the 95th percentile is
703 ms against a one-second budget, and the error rate is under a tenth of a
percent.

I am not a performance engineer. What I need is each of those three sentences
dealt with on its own terms - procurement will pick them apart one at a time
and I have to be able to defend whichever ones survive. I would rather be told
a sentence is fine than have it reworded for the sake of it, and I would rather
be told to drop one than sign something we cannot hold.

I also want to stop being in this position every quarter, so alongside the
answer I want something mechanical I can point at an export before anyone
drafts wording from it.

`lib/summary.mjs` already loads these exports and has a passing test beside it.

## Output Specification

1. `docs/capacity-statement.md` - the version that goes to legal. Take the
   three sentences one at a time: each one stands as written, stands reworded,
   or comes out, and say what the evidence for that is. Answer Marco's note
   directly.
2. `scripts/check-capacity.mjs` - the mechanical check. It reads a summary
   export and reports whether a capacity sentence can rest on that run and why
   not where it cannot. Run it against both exports in `runs/` and leave what
   it says in `reports/capacity-check.json`.
3. `test/check-capacity.test.mjs` - tests for it, running under `npm test` next
   to the existing test. `npm test` must be green.
4. `tests/load/api.js` - changed so that a repeat of Monday's run cannot come
   back reporting that everything passed.

Do not edit anything under `runs/`, do not change `lib/summary.mjs` or
`test/summary.test.mjs`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "capacity-reporting",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/capacity-statement.md ===============
# Performance commitment - draft for Halvorsen MSA schedule C

Prepared by Marco Deniz, 2026-09-09. Measured against pre-production (8 API
nodes, same instance class as production) with the configuration in
`tests/load/api.js`, run of 2026-09-08.

1. **The platform accepts 1,400 requests per second without refusing or
   queueing away any of them.**
2. **At that rate, 95% of requests complete in under 1,000 ms.**
3. **At that rate, fewer than 1 request in 1,000 fails.**

Supporting detail from the run:

- The run was configured to reach 1,400 requests/second and it reached it.
- 95th percentile response time: 703 ms.
- 90th percentile response time: 644 ms.
- Error rate: 0.09%.
- Both configured thresholds passed.

## Note from Marco, 2026-09-09

Somebody is going to point at the 118,240 in the export and ask about it. That
is our load generator running out of virtual users, not the platform - we
capped at 1,500 and the ramp needed more than that towards the end. I have
raised the cap to 4,000 for Friday's re-run, which will clear it. The latency
and error numbers will not move; the service was answering in about 700 ms the
whole way through and that is what the percentile says. I would not hold up
legal for it.

=============== FILE: tests/load/api.js ===============
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    ramp_to_peak: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 1500,
      stages: [
        { target: 1400, duration: '16m' },
        { target: 1400, duration: '4m' },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.005'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.get(`${BASE}/api/v2/positions?limit=50`);
  check(res, { 'positions returned': (r) => r.status === 200 });
}

=============== FILE: runs/2026-09-08-summary.json ===============
{
  "run": {
    "started": "2026-09-08T09:12:00Z",
    "duration_s": 1200,
    "script": "tests/load/api.js",
    "profile": "startRate 100, ramp to 1400/s over 16m, hold 1400/s for 4m",
    "exit_code": 0
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": { "avg": 452, "min": 88, "med": 244, "max": 14918, "p(90)": 644, "p(95)": 703 },
      "thresholds": { "p(95)<1000": { "ok": true } }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": { "avg": 446, "min": 83, "med": 238, "max": 14911, "p(90)": 638, "p(95)": 697 }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1.3, "min": 0.2, "med": 0.9, "max": 44, "p(90)": 2.5, "p(95)": 3.2 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 4.7, "min": 0.7, "med": 4, "max": 61, "p(90)": 8.1, "p(95)": 9.6 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.0009, "passes": 844, "fails": 936916 },
      "thresholds": { "rate<0.005": { "ok": true } }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 0.9991, "passes": 936916, "fails": 844 }
    },
    "http_reqs": { "type": "counter", "values": { "count": 937760, "rate": 781.47 } },
    "iterations": { "type": "counter", "values": { "count": 937760, "rate": 781.47 } },
    "dropped_iterations": { "type": "counter", "values": { "count": 118240, "rate": 98.53 } },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 453, "min": 89, "med": 245, "max": 14920, "p(90)": 645, "p(95)": 704 }
    },
    "vus": { "type": "gauge", "values": { "value": 1500, "min": 14, "max": 1500 } },
    "vus_max": { "type": "gauge", "values": { "value": 1500, "min": 1500, "max": 1500 } }
  }
}

=============== FILE: runs/2026-08-25-summary.json ===============
{
  "run": {
    "started": "2026-08-25T09:08:00Z",
    "duration_s": 1200,
    "script": "tests/load/api.js",
    "profile": "startRate 100, ramp to 900/s over 6m, hold 900/s for 14m",
    "exit_code": 0
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": { "avg": 236, "min": 71, "med": 198, "max": 2104, "p(90)": 331, "p(95)": 384 },
      "thresholds": { "p(95)<1000": { "ok": true } }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": { "avg": 230, "min": 66, "med": 192, "max": 2098, "p(90)": 325, "p(95)": 378 }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1.1, "min": 0.2, "med": 0.8, "max": 29, "p(90)": 2.1, "p(95)": 2.7 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 4.4, "min": 0.7, "med": 3.8, "max": 47, "p(90)": 7.6, "p(95)": 9.1 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.0004, "passes": 374, "fails": 935626 },
      "thresholds": { "rate<0.005": { "ok": true } }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 0.9996, "passes": 935626, "fails": 374 }
    },
    "http_reqs": { "type": "counter", "values": { "count": 936000, "rate": 780 } },
    "iterations": { "type": "counter", "values": { "count": 936000, "rate": 780 } },
    "dropped_iterations": { "type": "counter", "values": { "count": 0, "rate": 0 } },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 237, "min": 72, "med": 199, "max": 2106, "p(90)": 332, "p(95)": 385 }
    },
    "vus": { "type": "gauge", "values": { "value": 178, "min": 11, "max": 612 } },
    "vus_max": { "type": "gauge", "values": { "value": 1500, "min": 1500, "max": 1500 } }
  }
}

=============== FILE: lib/summary.mjs ===============
export function metricValues(summary, name) {
  const m = summary?.metrics?.[name];
  return m ? { type: m.type, ...m.values } : null;
}

export function thresholdResults(summary) {
  const out = [];
  for (const [metric, m] of Object.entries(summary?.metrics ?? {})) {
    for (const [expr, result] of Object.entries(m.thresholds ?? {})) {
      out.push({ metric, expression: expr, ok: result.ok === true });
    }
  }
  return out;
}

export function stat(summary, name, key) {
  const v = metricValues(summary, name);
  return v && key in v ? v[key] : null;
}

=============== FILE: test/summary.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { metricValues, thresholdResults, stat } from '../lib/summary.mjs';

const monday = JSON.parse(readFileSync('runs/2026-09-08-summary.json', 'utf8'));

test('reads a metric with its type and values', () => {
  const v = metricValues(monday, 'http_reqs');
  assert.equal(v.type, 'counter');
  assert.equal(v.count, 937760);
});

test('collects every threshold result in the export', () => {
  const results = thresholdResults(monday);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.ok));
});

test('returns null for a statistic the export does not carry', () => {
  assert.equal(stat(monday, 'http_req_duration', 'p(99)'), null);
  assert.equal(stat(monday, 'http_req_duration', 'p(95)'), 703);
});
