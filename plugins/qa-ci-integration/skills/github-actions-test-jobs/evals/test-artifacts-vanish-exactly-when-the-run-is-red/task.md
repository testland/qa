# A run with six failing tests posted a green check and merged

## Problem Description

`ledger-api` is a small Node service. Its PR job runs two suites. The unit suite
is ours. The contract suite belongs to the payments team and is the only reason
they let us ship without a manual sign-off, and their standing condition is that
it reports on every single run - including runs where our unit suite has already
fallen over. That condition is not up for renegotiation and I would rather you
told me a change is impossible than quietly traded it away.

Back in August the problem was artifacts. The moment the suite went red, the
JUnit file and the debug logs were not in the run's artifact list, so whoever got
paged had nothing to open. Run 8790 is the shape of it and it cost us an evening.
Priya rewrote the job on 21 Aug and that part genuinely worked - every step runs
now, on every run, and for the first time I can predict what I will get out of a
red build.

Then run 9042 happened, and it is attached. Six failing tests, a green check, and
the PR merged forty minutes later by someone who had no reason to doubt it. The
last step in that job is called "Fail the job if anything failed", and the log
says it was skipped. That step exists for precisely this run and precisely this
merge and it did not execute, and I cannot work out why from staring at the YAML.

What I want out of this: a red suite produces a red check, and the artifacts and
the coverage push keep happening on red runs, because losing those is what we
were fixing in the first place. While you are in there I also want a written
position on every step in that job - which of them should be running after a red
suite and which should not. I have never seen that written down and after 9042 I
do not trust my own read of it.

Do not touch `.github/workflows/lint.yml`; another team owns that file and we
have a standing agreement not to edit each other's workflows. Do not change what
either suite asserts - if a test is wrong that is a separate conversation.

## Output Specification

1. Rewrite `.github/workflows/test.yml`.
2. Write `docs/ci-step-policy.md`: a row per step of the `test` job saying
   whether that step runs after a red suite and why, plus what the check on run
   9042 would have reported once your change is in.
3. Leave `.github/workflows/lint.yml`, `test/`, `contract/` and `src/` exactly as
   they are.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/test.yml ===============
name: test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: mkdir -p test-results logs coverage

      - name: Unit suite
        id: unit
        continue-on-error: true
        run: npm run test:unit

      - name: Contract suite
        id: contract
        continue-on-error: true
        run: npm run test:contract

      - name: Upload junit + debug logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            test-results/
            logs/

      - name: Push coverage to the dashboard
        if: always()
        run: ./scripts/push-coverage.sh coverage/
        env:
          COVERAGE_TOKEN: ${{ secrets.COVERAGE_TOKEN }}

      - name: Push preview image
        if: always()
        run: ./scripts/publish-preview.sh
        env:
          REGISTRY_TOKEN: ${{ secrets.GHCR_TOKEN }}

      - name: Update the :latest tag
        if: always()
        run: ./scripts/promote-latest.sh ${{ github.sha }}
        env:
          REGISTRY_TOKEN: ${{ secrets.GHCR_TOKEN }}

      - name: Fail the job if anything failed
        if: failure()
        run: exit 1

=============== FILE: .github/workflows/lint.yml ===============
name: lint

on:
  pull_request:
    paths: ['src/**', '.eslintrc.json']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx eslint src

=============== FILE: ci/run-8790.txt ===============
run 8790 - test - pull_request #612 - 14 Aug 2026 09:41 UTC
Conclusion: failure

  npm ci ............................... success  0m36s
  Unit suite ........................... failure  1m52s
      tests 214   pass 211   fail 3
  Contract suite ....................... skipped
  Upload junit + debug logs ............ skipped
  Push coverage to the dashboard ....... skipped
  Push preview image ................... skipped
  Update the :latest tag ............... skipped

Artifacts: (none)

Comment from @pchandra, 21 Aug: "nothing to download on exactly the runs I care
about, and payments got no contract result again - second time this month. i am
rewriting this job so it stops bailing out halfway through."

=============== FILE: ci/run-9042.txt ===============
run 9042 - test - pull_request #714 - 03 Sep 2026 11:26 UTC
Conclusion: success

  npm ci ............................... success  0m38s
  Unit suite ........................... failure  2m11s
      tests 214   pass 208   fail 6
  Contract suite ....................... success  1m04s
      tests 61    pass 61    fail 0
  Upload junit + debug logs ............ success  0m09s
  Push coverage to the dashboard ....... success  0m04s
  Push preview image ................... success  0m52s
      pushed ghcr.io/ledger/ledger-api:pr-714
  Update the :latest tag ............... success  0m06s
      ghcr.io/ledger/ledger-api:latest -> 4e91c07
  Fail the job if anything failed ...... skipped

Artifacts: test-results (1.6 MB)
Check posted on #714: test - Successful in 4m12s
PR #714 merged 03 Sep 2026 12:08 UTC by @rlowell

=============== FILE: package.json ===============
{
  "name": "ledger-api",
  "version": "2.6.0",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.mjs contract/*.test.mjs",
    "test:unit": "node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=test-results/unit.xml test/*.test.mjs",
    "test:contract": "node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=test-results/contract.xml contract/*.test.mjs"
  }
}

=============== FILE: src/ledger.mjs ===============
export function applyEntry(balanceCents, entry) {
  if (!Number.isInteger(entry.amountCents)) {
    throw new TypeError('amountCents must be an integer number of cents');
  }
  return entry.kind === 'credit'
    ? balanceCents + entry.amountCents
    : balanceCents - entry.amountCents;
}

export function balanceOf(entries) {
  return entries.reduce(applyEntry, 0);
}

=============== FILE: test/ledger.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEntry, balanceOf } from '../src/ledger.mjs';

test('a credit increases the balance', () => {
  assert.equal(applyEntry(1000, { kind: 'credit', amountCents: 250 }), 1250);
});

test('a debit decreases the balance', () => {
  assert.equal(applyEntry(1000, { kind: 'debit', amountCents: 250 }), 750);
});

test('fractional cents are rejected', () => {
  assert.throws(() => applyEntry(0, { kind: 'credit', amountCents: 12.5 }), TypeError);
});

test('a ledger folds to its balance', () => {
  const entries = [
    { kind: 'credit', amountCents: 5000 },
    { kind: 'debit', amountCents: 1200 },
    { kind: 'debit', amountCents: 800 },
  ];
  assert.equal(balanceOf(entries), 3000);
});

=============== FILE: contract/settlement.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEntry, balanceOf } from '../src/ledger.mjs';

test('an empty ledger settles to zero', () => {
  assert.equal(balanceOf([]), 0);
});

test('credits and debits settle to the net amount', () => {
  const entries = [
    { kind: 'credit', amountCents: 2500 },
    { kind: 'debit', amountCents: 500 },
  ];
  assert.equal(balanceOf(entries), 2000);
});

test('a debit past the balance settles negative', () => {
  assert.equal(applyEntry(100, { kind: 'debit', amountCents: 350 }), -250);
});

test('settlement is order independent', () => {
  const a = [{ kind: 'credit', amountCents: 900 }, { kind: 'debit', amountCents: 400 }];
  const b = [{ kind: 'debit', amountCents: 400 }, { kind: 'credit', amountCents: 900 }];
  assert.equal(balanceOf(a), balanceOf(b));
});
