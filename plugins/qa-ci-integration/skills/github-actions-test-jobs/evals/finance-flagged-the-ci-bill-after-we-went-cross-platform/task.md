# Finance flagged our CI bill and I cannot tell which half of Marco's plan is real

## Problem Description

We went cross-platform on `paperclip` in July and our CI spend went from $612 in
June to $1,775 in August. Finance has asked for it down by the end of the month.
The August usage export from the billing page is attached, along with the
workflow.

Marco has written the plan and wants to merge it tomorrow. I would like a second
opinion first, because I am not a CI person and I cannot tell which of his items
are real savings and which are him being confident. In his words:

1. "Cache the dependencies. `actions/cache`, path `node_modules`, key
   `${{ runner.os }}-modules`. Checkout and install is a minute and a half of
   every single job - seven jobs a run, 620 runs last month - and we are paying
   it over and over for a tree that barely changes."

2. "Cap the matrix with `max-parallel: 2`. Right now one push spins up six
   runners at the same moment. Two at a time and we stop paying for six machines
   simultaneously."

3. "Shard the suite four ways. It takes eleven minutes; four shards takes about
   three; so we pay roughly a quarter of what we pay now for the same tests."

4. "Delete the macOS leg. Look at the export - it is the expensive one by a mile,
   and Linux and Windows between them cover everything a user can hit."

5. "Take Node 20 off the pull-request trigger and run it once a night instead.
   Pull requests keep Node 22 only."

Two things I know that are not in his write-up. Our desktop build ships a macOS
app. And the release wiki's list of last quarter's release blockers is at the
bottom of the export - I pasted it in because it seemed relevant to item 4 and I
would rather you looked at it than took my word.

Get the bill down. Tell me plainly which of the five to approve and which not,
with the reason in each case, and what you did instead.

## Output Specification

1. Rewrite `.github/workflows/test.yml`, splitting it into more than one workflow
   file if that is what your plan needs.
2. Write `docs/ci-cost-plan.md`: a verdict on each of Marco's five items with the
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
August total: $1,775.36.

| Runner         | Runner minutes | Multiplier |
|----------------|---------------:|-----------:|
| ubuntu-latest  |         14,880 |         x1 |
| windows-latest |         16,120 |         x2 |
| macos-latest   |         17,480 |        x10 |
| **Total**      |     **48,480** |            |

Run-level notes from the export:

- Median duration of one `test` matrix job: 9 min on Linux, 11 min on macOS,
  13 min on Windows. Checkout plus `npm ci` accounts for about 1.5 min of each.
- The `integration` job runs once per run on ubuntu-latest, median 6 min.
- 148 of the 620 runs had a newer commit pushed to the same branch before the
  run finished. Those runs continued to completion.

Longest 12 jobs on this account in August:

| Job                          | Duration |
|------------------------------|---------:|
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (windows-latest, 22)    |    14:12 |

Release blockers caught in Q2, from the release wiki:

| Blocker  | Found by                  | Note from the postmortem                          |
|----------|---------------------------|---------------------------------------------------|
| REL-3301 | test (macos-latest, 22)   | Keychain entitlement path.                         |
| REL-3318 | test (windows-latest, 20) | Path separator.                                    |
| REL-3327 | test (macos-latest, 20)   | Case-insensitive volume default. Surfaced only on  |
|          |                           | the re-run - on the first run that leg had already |
|          |                           | been stopped when the Windows job failed a minute  |
|          |                           | earlier.                                           |

=============== FILE: package.json ===============
{
  "name": "paperclip",
  "version": "7.1.0",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "test:integration": "node --test integration/*.test.mjs"
  },
  "devDependencies": {
    "c8": "^10.1.3"
  }
}

=============== FILE: package-lock.json ===============
{
  "name": "paperclip",
  "version": "7.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "paperclip",
      "version": "7.1.0",
      "devDependencies": {
        "c8": "^10.1.3"
      }
    },
    "node_modules/c8": {
      "version": "10.1.3",
      "resolved": "https://registry.npmjs.org/c8/-/c8-10.1.3.tgz",
      "dev": true,
      "engines": { "node": ">=18" }
    }
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
