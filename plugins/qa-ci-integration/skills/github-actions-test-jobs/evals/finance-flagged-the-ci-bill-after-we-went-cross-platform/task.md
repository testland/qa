# Finance flagged our CI bill and I cannot tell which half of Marco's plan is real

## Problem Description

We went cross-platform on `paperclip` in July and our CI spend went from $612 in
June to $2,336 in August. Finance has asked for it down by the end of the month.
The August usage export from the billing page is attached, along with the
workflow.

Marco has written the plan and wants to merge it tomorrow. I would like a second
opinion first, because I am not a CI person and I cannot tell which of his four
items are real savings and which are him being confident. In his words:

1. "Leave the matrix alone. It already stops the whole thing the moment one job
   fails, which is the single biggest thing keeping this bill from being worse. I
   want that written into the file explicitly so nobody 'fixes' it later."
2. "Shard the suite four ways. It takes eleven minutes; four shards takes about
   three; so we pay roughly a quarter of what we pay now for the same tests."
3. "Delete the macOS leg. Look at the export - it is the expensive one by a
   mile, and Linux and Windows between them cover everything a user can hit."
4. "Take Node 20 off the pull-request trigger and run it once a night instead.
   Pull requests keep Node 22 only."

Two things I know that are not in his write-up. Our desktop build ships a macOS
app. And when I asked around, two of the three release blockers we caught last
quarter were found by the macOS leg and by nothing else - they are listed at the
bottom of the export.

Get the bill down. Tell me plainly which of the four to approve and which not,
with the reason in each case, and what you did instead.

## Output Specification

1. Rewrite `.github/workflows/test.yml`, splitting it into more than one workflow
   file if that is what your plan needs.
2. Write `docs/ci-cost-plan.md`: a verdict on each of Marco's four items with the
   reason, the jobs-per-run count before and after for each trigger, and an
   estimate of the monthly billable minutes your plan removes, worked from the
   attached export.

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
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node }}' }
      - run: npm ci
      - run: npm test

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/postgres

=============== FILE: reports/august-usage.md ===============
# GitHub Actions usage export - paperclip - August 2026

Workflow: `test.yml`. 620 runs (487 on pull requests, 133 on pushes to main).
Billed at $0.008 per billable minute. Included minutes exhausted on 04 Aug.

| Runner         | Runner minutes | Multiplier | Billable minutes |     Cost |
|----------------|---------------:|-----------:|-----------------:|---------:|
| ubuntu-latest  |         18,600 |         x1 |           18,600 |  $148.80 |
| windows-latest |         21,700 |         x2 |           43,400 |  $347.20 |
| macos-latest   |         23,000 |        x10 |          230,000 | $1,840.00 |
| **Total**      |     **63,300** |            |      **292,000** | **$2,336.00** |

Run-level notes from the export:

- Median duration of one `test` matrix job: 9 min on Linux, 11 min on macOS,
  13 min on Windows. `npm ci` plus checkout accounts for 1.5 min of each.
- 148 of the 620 runs had a newer commit pushed to the same branch before the
  run finished. Those runs continued to completion.
- 11 jobs reached the maximum job duration and were terminated by the platform
  at 6 hours. All 11 were `test (macos-latest, 20)`. Cause not recorded here;
  the suite's own longest recorded run is 14 minutes.
- 96 runs were on branches whose only changed files were under `docs/`.

Release blockers caught in Q2, from the release wiki:

| Blocker  | Found by                        | Would Linux or Windows have caught it? |
|----------|---------------------------------|----------------------------------------|
| REL-3301 | test (macos-latest, 22)         | No - keychain entitlement path          |
| REL-3318 | test (windows-latest, 20)       | No - path separator                     |
| REL-3327 | test (macos-latest, 20)         | No - case-insensitive volume default    |

=============== FILE: package.json ===============
{
  "name": "paperclip",
  "version": "7.1.0",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "test:integration": "node --test integration/*.test.mjs"
  }
}

=============== FILE: src/clip.mjs ===============
export function clamp(value, lo, hi) {
  if (lo > hi) throw new RangeError('lo must not exceed hi');
  return Math.min(Math.max(value, lo), hi);
}

export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

=============== FILE: test/clip.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, chunk } from '../src/clip.mjs';

test('clamps below the floor', () => {
  assert.equal(clamp(-4, 0, 10), 0);
});

test('clamps above the ceiling', () => {
  assert.equal(clamp(99, 0, 10), 10);
});

test('leaves a value inside the range alone', () => {
  assert.equal(clamp(5, 0, 10), 5);
});

test('rejects an inverted range', () => {
  assert.throws(() => clamp(1, 10, 0), RangeError);
});

test('chunks evenly', () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
});

test('chunks with a short tail', () => {
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});

test('rejects a zero chunk size', () => {
  assert.throws(() => chunk([1], 0), RangeError);
});
