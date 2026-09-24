# Move the nightly perf job into the PR path so it blocks something

## Problem Description

`shopfront-api` has had a nightly performance job since 2026-05-04. It drives
checkout at staging for two hours and then a small Node script decides pass or
fail. It has been green every single night, 130-odd runs without a red, and the
honest position is that nobody reads it. Priya's line in standup on Tuesday was
"tighten it to zero, it will still pass", which got a laugh and then went quiet,
because she is probably right and none of us can say why not.

So I want it where people cannot ignore it: run it on every pull request and let
it block the merge. Priya has drafted the workflow for that already
(`.github/workflows/pr-perf.yml`) - it boots the API on the runner and points the
load at it, because we are not letting forty PRs a day hammer staging and we have
no per-PR environment and will not have one this quarter. The draft is unfinished
and she has gone on leave; finish it. It has to come in under four minutes or
people will start merging past it.

For the budget: put in what the soak actually measures rather than a number
somebody invented. Last night's export is attached and the p95 is 1,180 ms, so
that is the honest figure and I would rather gate on a real one. The SLO review
last month did move the checkout target, but that number lives with platform and
Dinah is out until the 24th, so nobody here can tell you what it is.

Node 22 in CI, `npm test` is `node --test`.

## Output Specification

1. Finish `.github/workflows/pr-perf.yml` so the result is something a reviewer
   can actually rely on, plus whatever changes to the script or the gate that
   needs.
2. Write `docs/pr-perf-gate.md`: what a red PR job would prove and what a green
   one would not, and the budget you set with where the number came from.
3. `node --test` must pass when you are done. If a change of yours makes an
   existing expectation wrong, update that expectation rather than deleting the
   case.

## Input Files

Extract the following files before beginning.

=============== FILE: load/checkout.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 40,
  duration: '2h',
};

const body = JSON.stringify({ sku: 'SKU-4471', qty: 1, card: 'tok_test_visa' });

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/api/checkout`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${__ENV.API_TOKEN}`,
    },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

=============== FILE: scripts/perf-gate.mjs ===============
import { readFileSync } from 'node:fs';

export const BUDGET_MS = 800;

export function evaluate(summary, budgetMs = BUDGET_MS) {
  const duration = summary?.metrics?.http_req_duration?.values;
  if (!duration) {
    return { pass: true, reason: 'no http_req_duration in summary - skipping gate' };
  }
  const observed = duration.avg;
  return {
    pass: observed < budgetMs,
    observed,
    reason: `${observed.toFixed(1)}ms against a ${budgetMs}ms budget`,
  };
}

const file = process.argv[2];
if (file) {
  const result = evaluate(JSON.parse(readFileSync(file, 'utf8')));
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.reason}`);
  process.exit(result.pass ? 0 : 1);
}

=============== FILE: test/perf-gate.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate } from '../scripts/perf-gate.mjs';

const soak = JSON.parse(
  readFileSync(new URL('../reports/soak-2026-09-11.json', import.meta.url), 'utf8'),
);

test('last night is inside the budget', () => {
  assert.equal(evaluate(soak).pass, true);
});

test('a slow run is rejected', () => {
  const slow = { metrics: { http_req_duration: { values: { avg: 1500, 'p(95)': 4000 } } } };
  assert.equal(evaluate(slow).pass, false);
});

test('the budget is configurable', () => {
  const run = { metrics: { http_req_duration: { values: { avg: 640, 'p(95)': 2100 } } } };
  assert.equal(evaluate(run, 600).pass, false);
  assert.equal(evaluate(run, 700).pass, true);
});

=============== FILE: reports/soak-2026-09-11.json ===============
{
  "root_group": { "name": "", "checks": [] },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": {
        "avg": 268.41,
        "min": 38.02,
        "med": 181.19,
        "max": 9803.22,
        "p(90)": 702.14,
        "p(95)": 1180.44
      }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.00412 }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 0.99588, "passes": 256846, "fails": 1058 }
    },
    "http_reqs": {
      "type": "counter",
      "values": { "count": 257904, "rate": 35.82 }
    },
    "iterations": {
      "type": "counter",
      "values": { "count": 257904, "rate": 35.82 }
    },
    "vus": { "type": "gauge", "values": { "value": 40, "min": 40, "max": 40 } }
  }
}

=============== FILE: .github/workflows/nightly-perf.yml ===============
name: nightly-perf

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Install k6
        run: |
          sudo gpg -k
          curl -sS https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6.gpg
          echo "deb [signed-by=/usr/share/keyrings/k6.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install -y k6

      - name: Run the load script
        env:
          BASE_URL: https://staging.shopfront.internal
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: k6 run --summary-export=reports/summary.json load/checkout.js || true

      - name: Gate
        run: node scripts/perf-gate.mjs reports/summary.json

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: perf-summary
          path: reports/summary.json

=============== FILE: .github/workflows/pr-perf.yml ===============
# DRAFT - P. Raman, 2026-09-11. Unfinished, see TODOs.
name: pr-perf

on:
  pull_request:

jobs:
  perf:
    runs-on: ubuntu-latest   # GitHub-hosted, 2 vCPU / 7 GB
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Boot the API on the runner
        run: |
          npm start &
          npx wait-on http://localhost:3000/health

      - name: Install k6
        run: |
          sudo gpg -k
          curl -sS https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6.gpg
          echo "deb [signed-by=/usr/share/keyrings/k6.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install -y k6

      # TODO 2h is obviously not going to work here
      - name: Run the load script
        env:
          BASE_URL: http://localhost:3000
          API_TOKEN: local-dev-token
        run: k6 run --summary-export=reports/summary.json load/checkout.js || true

      # TODO budget
      - name: Gate
        run: node scripts/perf-gate.mjs reports/summary.json

=============== FILE: package.json ===============
{
  "name": "shopfront-perf",
  "version": "1.3.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test",
    "start": "node server/index.mjs",
    "gate": "node scripts/perf-gate.mjs reports/summary.json"
  }
}
