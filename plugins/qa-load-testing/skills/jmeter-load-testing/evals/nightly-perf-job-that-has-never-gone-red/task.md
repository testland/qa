# The nightly payments job has been green for six weeks and I have stopped believing it

## Problem Description

On 2026-09-02 we ran a promo and the payments API stopped working properly for
about forty minutes. Support logged 340 tickets that afternoon. The nightly
payments job ran that night and went green, as it has every night since the end
of July.

On 2026-09-08 our perf lead replayed the 2 September arrival profile against
staging at the same concurrency, to see whether we could reproduce it. I have
attached a trimmed slice of the results file from that replay. The job went green
again.

Separately, and it may be the same problem or a different one: on the night of
2026-08-19 the application logs recorded three 500s from `/v1/checkout` inside the
nightly window, and the gate step printed `errors=0 max=10` exactly as it always
does. In six weeks that step has printed `errors=0` every single time.

Two other things you should have:

- On 2026-08-27 the gate step itself died. @bhaskar put a workaround into the
  workflow the same morning and it has not died since. His write-up is attached.
- The perf lead wants to delete the gate script and let the build fail if the
  runner comes back with a non-zero exit status, because "the tool knows whether
  the test failed". I would like a second opinion before we do that.

What I want is for the job to go red the next time staging behaves the way it did
on 2 and 8 September, and for whoever is on call at 03:00 to get something they
can act on. The runner is a stock hosted one, the run takes about eleven minutes
today, and the nightly results file has been over 400 MB since the mobile profile
went in.

## Output Specification

1. Change `ci/gate.mjs` so the job fails for whatever got through on 8 September
   and for whatever has been getting through since August.
2. Extend `ci/gate.test.mjs` with tests that would have failed against the
   implementation as it stands. `node --test` must pass against what you deliver.
3. Update `.github/workflows/perf-nightly.yml` so the gate receives everything it
   now needs, so the evidence survives the run, and so the job still works on the
   second night as well as the first.
4. Write `docs/perf-gate.md`: what the gate checks, every threshold number and
   where that number came from, a short answer to the perf lead's exit-status
   suggestion, and whether @bhaskar's workaround stays or goes.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/perf-nightly.yml ===============
name: perf-nightly

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  payments:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      # Keeps the artifacts folder between runs so ci/trend.mjs can append to it.
      - name: Restore artifacts
        uses: actions/cache@v4
        with:
          path: artifacts
          key: perf-nightly-artifacts

      - name: Run the payments profile
        run: |
          docker run --rm -v "$PWD:/work" -w /work apache/jmeter:5.6.3 \
            -n -t plans/payments.jmx \
            -l artifacts/results.jtl \
            -q bin/jmeter.properties \
            -Japi.base.url=https://staging.pay.example.com

      # Heap raised 2026-08-27, see reports/gate-2026-08-27.md
      - name: Gate
        env:
          NODE_OPTIONS: --max-old-space-size=6144
        run: node ci/gate.mjs artifacts/results.jtl

      - name: Trend
        if: always()
        run: node ci/trend.mjs artifacts/results.jtl

      - name: Upload
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: perf-nightly
          path: artifacts/results.jtl
          retention-days: 14

=============== FILE: ci/gate.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const MAX_ERRORS = 10;

export function countErrors(jtl) {
  let errors = 0;
  for (const line of jtl.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    if (cols[6] === 'false') errors += 1;
  }
  return errors;
}

export function verdict(jtl) {
  const errors = countErrors(jtl);
  return { errors, ok: errors <= MAX_ERRORS };
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gate.mjs');
if (invokedDirectly) {
  const { errors, ok } = verdict(readFileSync(process.argv[2], 'utf8'));
  console.log(`errors=${errors} max=${MAX_ERRORS}`);
  if (!ok) {
    console.log(`::error::${errors} failed samples exceeds the maximum of ${MAX_ERRORS}`);
    process.exit(1);
  }
}

=============== FILE: ci/gate.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countErrors, verdict, MAX_ERRORS } from './gate.mjs';

const cleanRun = [
  '1757318400123,412,POST /v1/checkout,200,OK,checkout 1-1,text,true,,2481,612,120,120,https://staging.pay.example.com/v1/checkout,398,0,22',
  '1757318400557,388,GET /v1/cards,200,OK,cards 1-2,text,true,,1104,402,120,120,https://staging.pay.example.com/v1/cards,371,0,19',
  '1757318401004,205,GET /v1/balance,200,OK,balance 1-3,text,true,,612,388,120,120,https://staging.pay.example.com/v1/balance,201,0,17',
].join('\n');

const replay = readFileSync(
  new URL('../artifacts/replay-2026-09-08.jtl', import.meta.url),
  'utf8',
);

test('a clean run reports no errored samples', () => {
  assert.equal(countErrors(cleanRun), 0);
});

test('a clean run passes the gate', () => {
  assert.equal(verdict(cleanRun).ok, true);
});

test('the error budget is ten samples', () => {
  assert.equal(MAX_ERRORS, 10);
});

test('the 8 September replay passes the gate', () => {
  assert.equal(countErrors(replay), 0);
  assert.equal(verdict(replay).ok, true);
});

=============== FILE: ci/trend.mjs ===============
// Appends tonight's error count to artifacts/trend.csv so the on-call can see
// whether a number is new. Depends on artifacts/ surviving between runs.
import { appendFileSync, readFileSync } from 'node:fs';
import { countErrors } from './gate.mjs';

const jtl = readFileSync(process.argv[2], 'utf8');
appendFileSync('artifacts/trend.csv', `${new Date().toISOString()},${countErrors(jtl)}\n`);

=============== FILE: bin/jmeter.properties ===============
# Handed to every CI run with -q. Not used for local authoring.
jmeter.save.saveservice.output_format=csv
jmeter.save.saveservice.print_field_names=false
jmeter.save.saveservice.assertion_results_failure_message=true
summariser.name=summary
summariser.interval=30
httpclient4.retrycount=0

=============== FILE: reports/gate-2026-08-27.md ===============
# 2026-08-27 — the gate step died

Run 4471, scheduled nightly. The load run itself finished normally and wrote its
results file. The Gate step ended:

    <--- Last few GCs --->
    FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
        at ci/gate.mjs

`artifacts/results.jtl` for that run was 412 MB. It has been over 400 MB every
night since the mobile profile went in on 2026-08-24.

Applied the same morning: `NODE_OPTIONS=--max-old-space-size=6144` on the Gate
step. Hosted runners have 16 GB so there is headroom for now. @bhaskar's comment
on the PR was "this buys us a few months, it is not a fix — the file only goes
one way, and we read the whole thing into a string before we look at it".

Nothing else was changed. The step has printed `errors=0 max=10` every night
since, the same as it did before.

=============== FILE: artifacts/replay-2026-09-08.jtl ===============
1757318400123,412,POST /v1/checkout,200,OK,checkout 1-1,text,true,,2481,612,120,120,https://staging.pay.example.com/v1/checkout,398,0,22
1757318400557,388,GET /v1/cards,200,OK,cards 1-2,text,true,,1104,402,120,120,https://staging.pay.example.com/v1/cards,371,0,19
1757318401004,205,GET /v1/balance,200,OK,balance 1-3,text,true,,612,388,120,120,https://staging.pay.example.com/v1/balance,201,0,17
1757318409881,7402,POST /v1/checkout,200,OK,checkout 1-9,text,true,,2477,612,120,120,https://staging.pay.example.com/v1/checkout,7388,0,21
1757318412330,412,GET /v1/cards,200,OK,cards 1-11,text,true,,1101,402,120,120,https://staging.pay.example.com/v1/cards,402,0,18
1757318418244,14907,POST /v1/checkout,200,OK,checkout 1-14,text,true,,2480,612,120,120,https://staging.pay.example.com/v1/checkout,14882,0,20
1757318419004,201,GET /v1/balance,200,OK,balance 1-15,text,true,,610,388,120,120,https://staging.pay.example.com/v1/balance,198,0,16
1757318426551,21118,POST /v1/checkout,200,OK,checkout 1-22,text,true,,2479,612,120,120,https://staging.pay.example.com/v1/checkout,21090,0,23
1757318430902,398,GET /v1/cards,200,OK,cards 1-25,text,true,,1103,402,120,120,https://staging.pay.example.com/v1/cards,381,0,19
1757318437118,24884,POST /v1/checkout,200,OK,checkout 1-31,text,true,,2478,612,120,120,https://staging.pay.example.com/v1/checkout,24851,0,22
1757318441776,219,GET /v1/balance,200,OK,balance 1-33,text,true,,611,388,120,120,https://staging.pay.example.com/v1/balance,214,0,17
1757318449330,27615,POST /v1/checkout,200,OK,checkout 1-38,text,true,,2481,612,120,120,https://staging.pay.example.com/v1/checkout,27580,0,24
1757318452004,405,GET /v1/cards,200,OK,cards 1-41,text,true,,1102,402,120,120,https://staging.pay.example.com/v1/cards,390,0,18
1757318458901,28431,POST /v1/checkout,200,OK,checkout 1-44,text,true,,2477,612,120,120,https://staging.pay.example.com/v1/checkout,28402,0,19
1757318461330,207,GET /v1/balance,200,OK,balance 1-47,text,true,,612,388,120,120,https://staging.pay.example.com/v1/balance,203,0,16
1757318466118,29118,POST /v1/checkout,200,OK,checkout 1-50,text,true,,2480,612,120,120,https://staging.pay.example.com/v1/checkout,29088,0,21
1757318470551,394,GET /v1/cards,200,OK,cards 1-53,text,true,,1104,402,120,120,https://staging.pay.example.com/v1/cards,377,0,18
1757318477244,26902,POST /v1/checkout,200,OK,checkout 1-57,text,true,,2479,612,120,120,https://staging.pay.example.com/v1/checkout,26871,0,20
1757318480881,212,GET /v1/balance,200,OK,balance 1-60,text,true,,610,388,120,120,https://staging.pay.example.com/v1/balance,207,0,17
1757318488330,25440,POST /v1/checkout,200,OK,checkout 1-63,text,true,,2478,612,120,120,https://staging.pay.example.com/v1/checkout,25411,0,22
1757318492004,401,GET /v1/cards,200,OK,cards 1-66,text,true,,1103,402,120,120,https://staging.pay.example.com/v1/cards,385,0,19
1757318499118,23907,POST /v1/checkout,200,OK,checkout 1-70,text,true,,2480,612,120,120,https://staging.pay.example.com/v1/checkout,23880,0,21

=============== FILE: docs/mobile-clients.md ===============
# Payments clients — timeouts and expectations

| Client            | Request timeout | Retries | Notes                            |
|-------------------|-----------------|---------|----------------------------------|
| iOS 6.x           | 30 s            | 2       | user sees a spinner the whole time |
| Android 6.x       | 30 s            | 2       | same                              |
| Web checkout      | 60 s            | 0       | shows an error page after that    |
| Partner API       | 15 s            | 1       | contractual, see MSA schedule 3   |

Card list and balance are rendered inline on the account screen; product has
asked for those to stay under half a second since the redesign. Checkout is a
single call at the end of the flow and has never had a written target, which is
part of why nobody noticed it moving.
