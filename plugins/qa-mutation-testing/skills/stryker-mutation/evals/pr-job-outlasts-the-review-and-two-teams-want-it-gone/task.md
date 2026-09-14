# The mutation job takes 34 minutes and people have started merging around it

## Problem Description

`checkout-web` runs a mutation job on every pull request. Last Tuesday it took
34 minutes 12 seconds on PR #4801, which was a two-line change to a currency
formatter. Review took nine minutes. Two of our four reviewers have started
approving and then merging with the job still yellow, which means the gate is
already decorative and I would rather fix it than pretend.

I have attached the config, the CI workflow, the package manifest and the full
log from that run. There is also the thread from Monday where four people
proposed four different things. I do not want to pick one of them by vote — I
want whichever of them is actually right, and the ones that are not, dismissed
in writing so the thread stops.

Constraints worth knowing before you answer:

- The runners are the standard 2-core hosted ones. We are not buying bigger
  ones this quarter, that conversation is closed.
- We do want a number that blocks a merge. The 55 in the config was agreed in
  a design review in June and I am not reopening it without a reason that is
  about correctness rather than about the job being slow.
- The full suite is 1,240 tests and takes 43 seconds. Nothing about it is slow.
- Whatever you change has to keep covering `src/checkout/**`. That is where the
  money code lives and it is the reason the job exists at all.

I need PR feedback in single-digit minutes and I need to be able to tell the two
reviewers who are merging around it that it is worth waiting for again.

## Output Specification

1. Edit `stryker.conf.json`, `.github/workflows/mutation.yml` and `package.json`
   so that a pull request gets useful feedback in single-digit minutes.
2. Write `docs/mutation-job-plan.md` — what is actually costing the 34 minutes,
   an explicit verdict on each of the four proposals in the thread, and the PR
   runtime you expect after the change.
3. Do not modify `src/checkout/totals.ts` or `src/checkout/totals.test.ts`.

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
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "thresholds": { "high": 80, "low": 60, "break": 55 }
}

=============== FILE: package.json ===============
{
  "name": "checkout-web",
  "version": "7.14.2",
  "private": true,
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --runInBand",
    "mutation": "stryker run"
  },
  "devDependencies": {
    "@stryker-mutator/core": "8.6.0",
    "@types/jest": "29.5.12",
    "jest": "29.7.0",
    "jest-environment-jsdom": "29.7.0",
    "ts-jest": "29.2.5",
    "typescript": "5.6.2"
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

Peak memory on the runner: 7.6 GB of 7 GB available; the job swapped for most of
the middle half hour. 43 of the timeouts are in `src/checkout/` and did not time
out on the same code when Priya ran the tool on her laptop.

=============== FILE: docs/thread-2026-09-09.md ===============
# #eng-checkout, Monday 9 September

**Tomas (platform):** Kill the job. We are at 86% line coverage on
`src/checkout/**` and nobody has ever pointed at a bug it caught. 34 minutes of
runner time per PR for a number nobody reads is not a trade I would sign.

**Rae (checkout):** Softer version — leave it running but set the break number
to 0 so it can never block anything. We keep the trend line, we stop the
blocking, everyone calms down. We can turn it back up later when it is faster.

**Ben (checkout):** The cost is the size of what we mutate. I ran it against
`src/utils/**` only and it finished in 4 minutes 2 seconds. Point it at utils,
keep it blocking, done by Wednesday.

**Marek (platform):** We are giving it 16 workers on a runner with 2 cores.
Obviously the answer is more workers — try 32 and see. If that does not do it
we ask for the bigger runners in January.

=============== FILE: src/checkout/totals.ts ===============
export interface Line {
  unitCents: number;
  qty: number;
  taxRate: number;
}

export function lineTotal(line: Line): number {
  if (line.qty <= 0) return 0;
  const net = line.unitCents * line.qty;
  return net + Math.round(net * line.taxRate);
}

export function orderTotal(lines: Line[], shippingCents: number): number {
  const goods = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const shipping = goods >= 5000 ? 0 : shippingCents;
  return goods + shipping;
}

=============== FILE: src/checkout/totals.test.ts ===============
import { lineTotal, orderTotal } from './totals';

describe('lineTotal', () => {
  it('applies tax to the net line value', () => {
    expect(lineTotal({ unitCents: 1000, qty: 2, taxRate: 0.2 })).toBe(2400);
  });

  it('is zero for a zero quantity', () => {
    expect(lineTotal({ unitCents: 1000, qty: 0, taxRate: 0.2 })).toBe(0);
  });
});

describe('orderTotal', () => {
  it('charges shipping below the free threshold', () => {
    const lines = [{ unitCents: 1000, qty: 1, taxRate: 0 }];
    expect(orderTotal(lines, 499)).toBe(1499);
  });

  it('ships free at the threshold', () => {
    const lines = [{ unitCents: 5000, qty: 1, taxRate: 0 }];
    expect(orderTotal(lines, 499)).toBe(5000);
  });
});
