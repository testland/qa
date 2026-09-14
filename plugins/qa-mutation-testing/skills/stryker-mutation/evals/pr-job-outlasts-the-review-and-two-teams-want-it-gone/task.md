# The PR mutation job takes 34 minutes and two reviewers now merge around it

## Problem Description

`checkout-web` runs a mutation job on every pull request. Last Tuesday it took
34 minutes 12 seconds on PR #4801, which was a two-line change to a currency
formatter. Review took nine minutes. Two of our four reviewers have started
approving and merging with the job still running, so the gate is already
decorative and I would rather fix it than pretend otherwise.

Attached are the config, the CI workflow, the package manifest, the full log
from that run, and Monday's thread where five people proposed five different
things. I do not want to pick one of them by vote. I want whichever of them is
actually right, and the ones that are not dismissed in writing so the thread
stops.

Constraints, all of them settled before you start:

- The runners are the standard 2-core hosted ones. We are not buying bigger
  ones this quarter; that conversation is closed.
- We do want a number that blocks a merge. The 55 was agreed in a design review
  in June and I am not reopening it for a reason that is about the job being
  slow rather than about correctness.
- The suite is 1,240 tests and finishes in 43 seconds. Nothing about the suite
  itself is slow.
- Whatever you change has to keep covering `src/checkout/**`. That is where the
  money code lives and it is the reason the job exists at all.
- We run our tests with `node --test` and the plain node assert library. Moving
  the suite onto a different test framework is off the table this quarter — the
  last attempt at that cost us three weeks and we reverted it.

I need PR feedback in single-digit minutes, and I need to be able to tell the
two reviewers who are merging around it that it is worth waiting for again.

## Output Specification

1. Edit `stryker.conf.json`, `.github/workflows/mutation.yml` and `package.json`
   so that a pull request gets useful feedback in single-digit minutes.
2. Write `docs/mutation-job-plan.md` — what is actually costing the 34 minutes,
   an explicit verdict on each of the five proposals in the thread, and the PR
   runtime you expect after the change.
3. Do not modify `src/checkout/totals.js` or `test/checkout/totals.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: stryker.conf.json ===============
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "command",
  "commandRunner": { "command": "npm test" },
  "coverageAnalysis": "off",
  "concurrency": 16,
  "timeoutMS": 120000,
  "reporters": ["progress", "clear-text"],
  "mutate": ["src/**/*.js", "!src/**/*.test.js"],
  "thresholds": { "high": 80, "low": 60, "break": 55 }
}

=============== FILE: package.json ===============
{
  "name": "checkout-web",
  "version": "7.14.2",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "mutation": "stryker run"
  },
  "devDependencies": {
    "@stryker-mutator/core": "8.6.0"
  }
}

=============== FILE: .github/workflows/mutation.yml ===============
name: mutation

on:
  pull_request:
    branches: [main]

jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx stryker run

=============== FILE: reports/pr-4801-run.log ===============
14:02:09 (2914) INFO ConfigReader Using stryker.conf.json
14:02:11 (2914) INFO InputFileResolver Found 412 of 1,180 file(s) to be mutated.
14:02:14 (2914) INFO Instrumenter Instrumented 412 source file(s) with 1,412 mutant(s)
14:02:14 (2914) INFO ConcurrencyTokenProvider Creating 16 test runner process(es).
14:02:57 (2914) INFO DryRunExecutor Starting initial test run. This may take a while.
14:03:40 (2914) INFO DryRunExecutor Initial test run succeeded. Ran 1,240 tests in 43 seconds (net 41 seconds, overhead 2 seconds).
14:03:40 (2914) INFO MutationTestExecutor 1,412 mutant(s) generated, 0 excluded, 1,412 to be tested.
Mutation testing  [====================] 100% (elapsed: 32m, remaining: 0s) 1,412/1,412 Mutants tested (871 killed, 498 survived, 43 timed out)
14:36:21 (2914) INFO MutationTestExecutor Done in 34 minutes 12 seconds.

Ran 1,412 mutants. 1,240.00 tests per mutant on average.
--------------|---------|----------|-----------|------------|----------|
File          | % score | # killed | # timeout | # survived | # no cov |
--------------|---------|----------|-----------|------------|----------|
All files     |   64.73 |      871 |        43 |        498 |        0 |
--------------|---------|----------|-----------|------------|----------|

Runner notes appended by the CI team:

- Peak memory on the runner was 7.6 GB against 7 GB available; the job swapped
  for most of the middle half hour.
- 43 of the timeouts are in `src/checkout/` and the same mutants did not time
  out when Priya ran the tool on her laptop.
- The pull request under test changed exactly one file,
  `src/format/currency.js`.

=============== FILE: docs/thread-2026-09-09.md ===============
# #eng-checkout, Monday 9 September

**Tomas (platform):** Kill the job. We are at 86% line coverage on
`src/checkout/**` and nobody has ever pointed at a bug it caught. 34 minutes of
runner time per PR for a number nobody reads is not a trade I would sign.

**Rae (checkout):** Softer version — leave it running but set the break number
to 0 so it can never block anything. We keep the trend line and we stop the
blocking. We can turn it back up later once it is faster.

**Priya (platform):** This is one line. `coverageAnalysis` is set to `"off"`,
which the configuration reference describes as "Stryker does no optimization,
all tests are executed for each mutant" — and the log agrees, 1,240 tests per
mutant. The documented fast setting is `"perTest"`, which only runs the tests
that cover the mutant. Change that one key. No new dependencies, no migration,
nothing else in the repo moves. It is the only proposal in this thread that
respects the constraint about not touching the test framework, and I would
merge it today.

**Ben (checkout):** The cost is the size of what we mutate. I ran it against
`src/utils/**` only and it finished in 4 minutes 2 seconds. Point it at utils,
keep it blocking, done by Wednesday.

**Marek (platform):** We are giving it 16 workers on a runner with 2 cores.
Obviously the answer is more workers — try 32 and see. If that does not do it we
ask for the bigger runners in January.

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

=============== FILE: test/checkout/totals.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, orderTotal } from '../../src/checkout/totals.js';

test('lineTotal applies tax to the net line value', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 2, taxRate: 0.2 }), 2400);
});

test('lineTotal is zero for a zero quantity', () => {
  assert.equal(lineTotal({ unitCents: 1000, qty: 0, taxRate: 0.2 }), 0);
});

test('orderTotal charges shipping below the free threshold', () => {
  assert.equal(orderTotal([{ unitCents: 1000, qty: 1, taxRate: 0 }], 499), 1499);
});

test('orderTotal ships free at the threshold', () => {
  assert.equal(orderTotal([{ unitCents: 5000, qty: 1, taxRate: 0 }], 499), 5000);
});
