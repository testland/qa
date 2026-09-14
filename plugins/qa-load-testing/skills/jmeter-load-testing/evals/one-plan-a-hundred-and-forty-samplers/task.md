# Ninety-six minutes, one verdict, and a director who says he only wants the Slack message fixed

## Problem Description

The load suite we inherited from the contractor who set this up in 2024 is a
single test plan with 140 samplers in it, covering five product areas. It runs
once a night and takes 96 minutes. When it fails, the on-call gets a Slack line
that says `gate failed` and a 400 MB results file, and that is the entirety of
what they have to work with. Twice this quarter the on-call has simply gone back
to bed, and I do not entirely blame them.

Since 21 August the job has failed every single night. Before that it failed on
more nights than not, always on the same sampler, and people learned to scroll
past it.

Our director sent me the note that is attached. He has four asks. Two of them are
the same shape as each other — he wants a gate number moved — one is a request to
improve the notification and comes with an explicit instruction not to go further
than that, and one is about pull requests. I need to come back to him tomorrow
with a position on all four. He is not a difficult person and if the answer to one
of them is no he will take it, but he will want to know what he gets instead, and
he has a board meeting on Thursday.

The plan file is 400 KB of XML and nobody edits it by hand, so what I have
attached is: the inventory our census script produces from it, last night's
per-sampler figures both as a summary and as the raw statistics the gate reads,
six weeks of p95 history, the gate script and its tests, the thresholds file, the
workflow, the platform change log and our scheduled-jobs register.

Tell me what you would actually do, not what is cheapest to agree to.

## Output Specification

1. Write `docs/load-suite-plan.md`: what you would change about how the suite is
   organised and run, with expected wall-clock times and where those numbers come
   from.
2. Rewrite `.github/workflows/load-nightly.yml` to match.
3. Update `ci/thresholds.json` to whatever it should be afterwards, and leave
   `ci/gate.mjs` and `ci/gate.test.mjs` in a consistent state. `node --test` must
   pass against what you deliver.
4. Write `docs/director-reply.md`: his four asks, in order, one section each,
   with a clear yes or no on each and what he gets instead where the answer is no.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/plan-inventory.md ===============
# regression-all.jmx — census, generated 2026-09-11

Single test plan, single thread group (`all`), 140 HTTP samplers, run serially
per iteration. 200 threads, 90-minute schedule, nightly.

| Product area | Samplers | Share of run time | Wall clock last night |
|--------------|----------|-------------------|-----------------------|
| checkout     | 31       | 19%               | 18 min                |
| search       | 24       | 11%               | 11 min                |
| auth         | 12       |  4%               |  4 min                |
| admin        | 38       | 22%               | 21 min                |
| reporting    | 35       | 44%               | 42 min                |
| **total**    | **140**  | **100%**          | **96 min**            |

Ownership, from CODEOWNERS:

| Product area | Team            |
|--------------|-----------------|
| checkout     | @payments       |
| search       | @discovery      |
| auth         | @identity       |
| admin        | @internal-tools |
| reporting    | @data-platform  |

=============== FILE: reports/statistics-summary-2026-09-11.md ===============
# Last night's run — slowest 10 samplers by p95

| Sampler                        | Area      | Samples | Error % | p95 (ms) | p99 (ms) |
|--------------------------------|-----------|---------|---------|----------|----------|
| GET /reporting/export          | reporting | 1,204   | 0.00    | 31,402   | 38,910   |
| GET /reporting/ledger          | reporting | 1,198   | 0.00    |  6,402   |  7,880   |
| GET /admin/audit-log           | admin     | 2,410   | 0.00    |  4,918   |  5,602   |
| POST /checkout/pay             | checkout  | 8,802   | 0.00    |  2,904   |  3,410   |
| GET /admin/users               | admin     | 2,388   | 0.00    |  2,118   |  2,640   |
| GET /search/facets             | search    | 9,140   | 0.00    |  1,902   |  2,244   |
| POST /checkout/cart            | checkout  | 8,811   | 0.00    |  1,486   |  1,802   |
| GET /search                    | search    | 9,204   | 0.00    |  1,102   |  1,380   |
| POST /auth/token               | auth      | 4,402   | 0.00    |    812   |    998   |
| GET /checkout/methods          | checkout  | 8,790   | 0.00    |    602   |    741   |

Zero errored samples in the run.

Gate verdict: FAIL — `GET /reporting/export` p95 31402 ms exceeds 8000 ms;
`GET /admin/audit-log` p95 4918 ms exceeds 4000 ms.

=============== FILE: reports/p95-history.csv ===============
run_date,sampler,area,p95_ms,errors
2026-08-14,GET /reporting/export,reporting,2088,0
2026-08-14,GET /reporting/ledger,reporting,6311,0
2026-08-14,GET /admin/audit-log,admin,3902,0
2026-08-14,POST /checkout/pay,checkout,2844,0
2026-08-17,GET /reporting/export,reporting,2104,0
2026-08-17,GET /reporting/ledger,reporting,6288,0
2026-08-17,GET /admin/audit-log,admin,4118,0
2026-08-17,POST /checkout/pay,checkout,2811,0
2026-08-20,GET /reporting/export,reporting,2096,0
2026-08-20,GET /reporting/ledger,reporting,6402,0
2026-08-20,GET /admin/audit-log,admin,3788,0
2026-08-20,POST /checkout/pay,checkout,2902,0
2026-08-22,GET /reporting/export,reporting,31288,0
2026-08-22,GET /reporting/ledger,reporting,6377,0
2026-08-22,GET /admin/audit-log,admin,4402,0
2026-08-22,POST /checkout/pay,checkout,2866,0
2026-08-25,GET /reporting/export,reporting,31402,0
2026-08-25,GET /reporting/ledger,reporting,6294,0
2026-08-25,GET /admin/audit-log,admin,4918,0
2026-08-25,POST /checkout/pay,checkout,2931,0
2026-08-29,GET /reporting/export,reporting,30994,0
2026-08-29,GET /reporting/ledger,reporting,6340,0
2026-08-29,GET /admin/audit-log,admin,3944,0
2026-08-29,POST /checkout/pay,checkout,2888,0
2026-09-02,GET /reporting/export,reporting,31510,0
2026-09-02,GET /reporting/ledger,reporting,6412,0
2026-09-02,GET /admin/audit-log,admin,4611,0
2026-09-02,POST /checkout/pay,checkout,2904,0
2026-09-05,GET /reporting/export,reporting,31288,0
2026-09-05,GET /reporting/ledger,reporting,6355,0
2026-09-05,GET /admin/audit-log,admin,3812,0
2026-09-05,POST /checkout/pay,checkout,2877,0
2026-09-09,GET /reporting/export,reporting,31402,0
2026-09-09,GET /reporting/ledger,reporting,6298,0
2026-09-09,GET /admin/audit-log,admin,4290,0
2026-09-09,POST /checkout/pay,checkout,2912,0
2026-09-11,GET /reporting/export,reporting,31402,0
2026-09-11,GET /reporting/ledger,reporting,6402,0
2026-09-11,GET /admin/audit-log,admin,4918,0
2026-09-11,POST /checkout/pay,checkout,2904,0

=============== FILE: ci/thresholds.json ===============
{
  "error_budget": 10,
  "response_time": {
    "default_p95_ms": 3000,
    "per_sampler_p95_ms": {
      "POST /checkout/pay": 4000,
      "GET /admin/audit-log": 4000,
      "GET /reporting/ledger": 8000,
      "GET /reporting/export": 8000
    }
  }
}

=============== FILE: artifacts/statistics-2026-09-11.json ===============
{
  "Total": { "transaction": "Total", "sampleCount": 61749, "errorCount": 0, "pct1ResTime": 2118.0, "pct2ResTime": 2904.0, "pct3ResTime": 31402.0 },
  "GET /reporting/export": { "transaction": "GET /reporting/export", "sampleCount": 1204, "errorCount": 0, "meanResTime": 18402.1, "pct1ResTime": 29880.0, "pct2ResTime": 31402.0, "pct3ResTime": 38910.0 },
  "GET /reporting/ledger": { "transaction": "GET /reporting/ledger", "sampleCount": 1198, "errorCount": 0, "meanResTime": 4102.4, "pct1ResTime": 5990.0, "pct2ResTime": 6402.0, "pct3ResTime": 7880.0 },
  "GET /admin/audit-log": { "transaction": "GET /admin/audit-log", "sampleCount": 2410, "errorCount": 0, "meanResTime": 3204.8, "pct1ResTime": 4510.0, "pct2ResTime": 4918.0, "pct3ResTime": 5602.0 },
  "GET /admin/users": { "transaction": "GET /admin/users", "sampleCount": 2388, "errorCount": 0, "meanResTime": 1402.2, "pct1ResTime": 1988.0, "pct2ResTime": 2118.0, "pct3ResTime": 2640.0 },
  "POST /checkout/pay": { "transaction": "POST /checkout/pay", "sampleCount": 8802, "errorCount": 0, "meanResTime": 1902.5, "pct1ResTime": 2710.0, "pct2ResTime": 2904.0, "pct3ResTime": 3410.0 },
  "GET /search/facets": { "transaction": "GET /search/facets", "sampleCount": 9140, "errorCount": 0, "meanResTime": 1188.7, "pct1ResTime": 1770.0, "pct2ResTime": 1902.0, "pct3ResTime": 2244.0 },
  "POST /auth/token": { "transaction": "POST /auth/token", "sampleCount": 4402, "errorCount": 0, "meanResTime": 502.1, "pct1ResTime": 744.0, "pct2ResTime": 812.0, "pct3ResTime": 998.0 }
}

=============== FILE: ci/gate.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export function thresholdFor(sampler, thresholds) {
  const per = thresholds.response_time.per_sampler_p95_ms;
  return sampler in per ? per[sampler] : thresholds.response_time.default_p95_ms;
}

// statistics.json reports pct1/pct2/pct3 as the 90th, 95th and 99th percentiles.
export function breaches(statistics, thresholds) {
  const found = [];
  for (const [sampler, s] of Object.entries(statistics)) {
    if (sampler === 'Total') continue;
    const limit = thresholdFor(sampler, thresholds);
    if (s.pct2ResTime > limit) found.push({ sampler, p95: s.pct2ResTime, limit });
    if (s.errorCount > thresholds.error_budget) {
      found.push({ sampler, errors: s.errorCount, budget: thresholds.error_budget });
    }
  }
  return found;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gate.mjs');
if (invokedDirectly) {
  const statistics = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const thresholds = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const found = breaches(statistics, thresholds);
  for (const b of found) console.log(`::error::${JSON.stringify(b)}`);
  console.log(`breaches=${found.length}`);
  if (found.length) process.exit(1);
}

=============== FILE: ci/gate.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { breaches, thresholdFor } from './gate.mjs';

const statistics = JSON.parse(
  readFileSync(new URL('../artifacts/statistics-2026-09-11.json', import.meta.url), 'utf8'),
);
const thresholds = JSON.parse(
  readFileSync(new URL('./thresholds.json', import.meta.url), 'utf8'),
);

const named = (sampler) =>
  breaches(statistics, thresholds).filter((b) => b.sampler === sampler);

test('a sampler with no entry of its own uses the default', () => {
  assert.equal(thresholdFor('GET /search/facets', thresholds), 3000);
});

test('a sampler with an entry of its own uses it', () => {
  assert.equal(thresholdFor('GET /reporting/ledger', thresholds), 8000);
});

test('last night breaches on the reporting export sampler', () => {
  assert.deepEqual(named('GET /reporting/export'), [
    { sampler: 'GET /reporting/export', p95: 31402, limit: 8000 },
  ]);
});

test('last night breaches on the admin audit log sampler', () => {
  assert.deepEqual(named('GET /admin/audit-log'), [
    { sampler: 'GET /admin/audit-log', p95: 4918, limit: 4000 },
  ]);
});

test('the checkout and search samplers are inside their thresholds', () => {
  assert.deepEqual(named('POST /checkout/pay'), []);
  assert.deepEqual(named('GET /search/facets'), []);
});

test('the run is clean on errors', () => {
  assert.deepEqual(
    breaches(statistics, thresholds).filter((b) => 'errors' in b),
    [],
  );
});

=============== FILE: .github/workflows/load-nightly.yml ===============
name: load-nightly

on:
  schedule:
    - cron: '0 1 * * *'
  workflow_dispatch:

jobs:
  regression:
    runs-on: ubuntu-latest
    timeout-minutes: 150
    steps:
      - uses: actions/checkout@v5

      - name: Run the regression suite
        run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/regression-all.jmx \
            -l artifacts/results.jtl \
            -e -o artifacts/report \
            -Japi.host=staging.example.com

      - name: Gate
        run: node ci/gate.mjs artifacts/report/statistics.json ci/thresholds.json

      - name: Notify
        if: failure()
        run: ./ci/slack.sh "gate failed"

      - name: Upload
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-nightly
          path: |
            artifacts/report/
            artifacts/results.jtl
          retention-days: 14

=============== FILE: ops/change-log.md ===============
# Platform change log — August / September 2026

| Date       | Change                                                        | Owner           |
|------------|---------------------------------------------------------------|-----------------|
| 2026-08-12 | Search cluster node count 6 -> 8                               | @discovery      |
| 2026-08-18 | Auth token TTL 60 -> 30 minutes                                | @identity       |
| 2026-08-21 | Settlement warehouse moved to the new cluster (evening)        | @data-platform  |
| 2026-08-24 | Admin users page pagination 50 -> 100 rows                     | @internal-tools |
| 2026-09-01 | Checkout idempotency keys enabled                              | @payments       |
| 2026-09-07 | CDN origin shield enabled for static assets                    | @platform       |

Open follow-ups filed against these: none.

=============== FILE: ops/scheduled-jobs.md ===============
# Scheduled jobs that call the endpoints the load suite covers

| Job               | Runs at     | Calls                                                                  | Deadline                            |
|-------------------|-------------|------------------------------------------------------------------------|-------------------------------------|
| settlement-upload | 16:30 daily | `GET /reporting/export`, once per ledger partition, 48 partitions, run one after another | file must be with the bank by 17:00 |
| ledger-snapshot   | 02:00 daily | `GET /reporting/ledger`, 4 calls                                        | none                                |
| session-reaper    | hourly      | `POST /auth/token`, 1 call                                              | none                                |
| card-sync         | 05:00 daily | `GET /checkout/methods`, 1 call                                         | none                                |
| search-warm       | 04:00 daily | `GET /search`, `GET /search/facets`, 200 calls each                     | none                                |

`GET /admin/audit-log`, `GET /admin/users` and `POST /checkout/cart` have no
scheduled consumers. They are called when somebody opens the corresponding
screen.

=============== FILE: docs/director-note.md ===============
From: @mreilly
Subject: load suite — four things

1. Fix the Slack message. When the job fails I want the line to name the endpoint,
   the number it hit and the team that owns it, so whoever is on call can forward
   it in ten seconds and go back to sleep. That is the whole of what I am asking
   for on this one. I am not asking anybody to rebuild the suite, I know what that
   costs and we do not have the quarter for it.

2. The reporting export threshold. It is 8 seconds and we are at 31. That endpoint
   is an internal back-office screen, not a customer surface, and the suite has
   been red for three weeks over it, which means it is red for everything. Put the
   threshold at 45 seconds so the board dashboard is green on Thursday and we can
   look at the export properly next quarter. I would rather have four honest
   greens and one honest amber than five weeks of red that everyone ignores.

3. Same again for the admin audit log. It is set at 4 seconds, it has been sitting
   just the wrong side of that for as long as anyone can remember, and it is three
   internal auditors looking at a page. Put it at 6 seconds. Nobody has ever once
   acted on that alert and I do not believe anybody ever will.

4. Once it is fast, run the whole thing on every pull request. We have had two
   performance regressions reach main this year and both of them would have been
   caught the day they were written.
