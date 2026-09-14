# Six months of green builds and the score is 52

## Problem Description

We turned the mutation gate on in March at 60. The score that month was 78.1.
Leena pulled the artifacts on Thursday because she wanted the trend for a
retro, and the September number is 52.4. The job has been green every single
week since March. Not one failure, not one red build, nobody was ever told.

I have attached the config, the workflow, the monthly history Leena assembled
from the artifacts, and the console summary from the September run.

Two things I need out of this.

First, the gate has to actually gate. Leena ran the exact same command on her
machine against last week's tree and `echo $?` printed 1, so the tool is doing
its job and something between the tool and the build result is not. I want to
be able to point at the change and say "that is why it will fail next time".

Second, Dominic wants the number put back to 75. His argument is that we were
at 78 in March, we were clearly capable of 78, and a gate at 52 is an admission
of defeat. He is the director and he will push on this, so if the answer is no
I need the reason written down in a form he will accept, along with whatever
you think the number should be and when it moves.

I am not interested in an abstract explanation of what mutation testing is. I
want the config and the workflow changed, and a document I can send to Dominic
and to the four tech leads on Monday morning.

## Output Specification

1. Edit `stryker.conf.json` and `.github/workflows/mutation.yml`.
2. Write `docs/mutation-gate-recovery.md` — why six months of builds passed
   while the score fell 26 points, what the score actually is once the run is
   measuring the right files, the answer to Dominic, and the schedule for the
   number between now and the end of the financial year in March.

## Input Files

Extract the following files before beginning.

=============== FILE: stryker.conf.json ===============
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "tap",
  "tap": { "testFiles": ["src/**/*.test.js"] },
  "coverageAnalysis": "perTest",
  "concurrency": 4,
  "reporters": ["progress", "clear-text"],
  "mutate": ["src/**/*.js"],
  "thresholds": { "high": 80, "low": 60, "break": 60 }
}

=============== FILE: .github/workflows/mutation.yml ===============
name: mutation

on:
  schedule:
    - cron: '0 3 * * 1'
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: mkdir -p reports

      - name: Mutation testing
        run: npx stryker run | tee reports/mutation-summary.txt

      - name: Archive summary
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-summary
          path: reports/mutation-summary.txt

=============== FILE: reports/score-history.md ===============
# Mutation score by month, assembled from the archived summaries

Compiled by @leena on 2026-09-10 from the `mutation-summary` artifact of the
first Monday run of each month.

| Month    | Score | Line coverage | Valid mutants | Job conclusion |
|----------|-------|---------------|---------------|----------------|
| 2026-03  | 78.1% | 86.2%         | 1,402         | success        |
| 2026-04  | 74.6% | 86.0%         | 1,471         | success        |
| 2026-05  | 71.2% | 86.4%         | 1,538         | success        |
| 2026-06  | 66.9% | 85.9%         | 1,644         | success        |
| 2026-07  | 61.4% | 86.1%         | 1,702         | success        |
| 2026-08  | 56.8% | 86.0%         | 1,795         | success        |
| 2026-09  | 52.4% | 86.2%         | 1,880         | success        |

Notes from Leena:

- Twenty-six weekly runs since the gate landed. Every one of them concluded
  `success`. The four that printed a score under 60 concluded `success` too.
- The mutant count rises every month, so each run is analysing that month's
  code rather than replaying an old result.
- I checked out last week's tree and ran `npx stryker run` on my laptop with
  the repo config. It printed the same 52.4 and then `echo $?` gave me 1.
- Nobody has ever been able to see which mutants survived. The artifact is the
  console summary and that is all we keep.
- Line coverage over the same period is the third column. It has not moved.

=============== FILE: reports/mutation-summary-2026-09-01.txt ===============
Mutation testing  [====================] 100% (elapsed: 51m, remaining: 0s) 1880/1880 Mutants tested

-----------------------------|---------|----------|-----------|------------|----------|
File                         | % score | # killed | # timeout | # survived | # no cov |
-----------------------------|---------|----------|-----------|------------|----------|
All files                    |   52.39 |      961 |        24 |        844 |       51 |
 src/cart/cart.js            |   40.07 |      113 |         8 |        172 |        9 |
 src/cart/cart.test.js       |   96.88 |       93 |         0 |         3 |        0 |
 src/checkout/totals.js      |   44.03 |      110 |         8 |        144 |        6 |
 src/checkout/totals.test.js |   96.43 |       81 |         0 |         3 |        0 |
 src/pricing/rules.js        |   39.34 |       92 |         4 |        141 |        7 |
 src/pricing/rules.test.js   |   95.77 |       68 |         0 |         3 |        0 |
 src/session/session.js      |   38.36 |       82 |         2 |        126 |        9 |
 src/session/session.test.js |   95.24 |       60 |         0 |         3 |        0 |
 src/search/query.js         |   37.44 |       78 |         1 |       124 |        8 |
 src/search/query.test.js    |   95.16 |       59 |         0 |         3 |        0 |
 src/notify/email.js         |   35.92 |       73 |         1 |       120 |       12 |
 src/notify/email.test.js    |   96.30 |       52 |         0 |         2 |        0 |
-----------------------------|---------|----------|-----------|------------|----------|

=============== FILE: src/checkout/totals.js ===============
export function lineTotal(line) {
  if (line.qty <= 0) return 0;
  const net = line.unitCents * line.qty;
  return net + Math.round(net * line.taxRate);
}

export function orderTotal(lines, shippingCents) {
  const goods = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const shipping = goods >= 5000 ? 0 : shippingCents;
  return goods + shipping;
}

=============== FILE: src/checkout/totals.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, orderTotal } from './totals.js';

test('lineTotal applies tax to the net line value', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 2, taxRate: 0.2 }), 2400);
});

test('lineTotal is zero for a zero quantity', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 0, taxRate: 0.2 }), 0);
});

test('orderTotal ships free at the threshold', () => {
  assert.equal(orderTotal([{ unitCents: 5000, qty: 1, taxRate: 0 }], 499), 5000);
});
