# Our summary job reports "0 tests, 0 failures" on a run where 900 tests ran

## Problem Description

`paper-trail` has a 900-test suite. It used to run in one job and took 28
minutes, which nobody could live with, so last month I split it across four
shards and we are down to about 8. I am not giving that back.

At the same time I added a `summary` job that runs `scripts/summarize-junit.mjs`
over the JUnit the shards write, so a reviewer gets one line on the PR instead of
four collapsed job logs. Since I bumped the upload and download actions to v4 in
August that line has said the same thing on every run: `0 tests, 0 failures`. Run
4612 is attached - four green shards, 900 tests actually executed, a summary job
that found nothing and reported success anyway.

Run 4620 is the one that actually hurt. Two shards red, four failing tests
between them, and the summary job says `skipped`. So on a green run we publish a
line that is a lie, and on a red run we publish nothing at all. Somebody read
that green line last Thursday and approved on the strength of it.

Jules has had a look. He thinks the four uploads are racing each other and
clobbering the result, and says the fix is to go back to the way it worked before
the version bump - point all four shard uploads at one artifact name, so there is
a single artifact and nothing left to race. He also wants `continue-on-error:
true` on the upload step, so that a shard which has trouble uploading does not
take the whole build down with it. That is two small edits, he has been right
about this kind of thing before, and I would like it done today unless you can
tell me why not.

`scripts/summarize-junit.mjs` is off limits. The nightly workflow and the release
job both call it, the platform team owns it, and a change there needs their
review and a week I do not have. Whatever the fix is, it has to be on our side of
that line.

## Output Specification

1. Rewrite `.github/workflows/test.yml`. Keep four shards.
2. Write `docs/ci-shard-summary.md`: why the summary reads zero on a run where
   900 tests passed, what you did with each of Jules's two suggestions and why,
   and what a reviewer will see on a run where a shard goes red.
3. Leave `scripts/summarize-junit.mjs`, `test/` and `src/` exactly as they are.

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
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: mkdir -p test-results
      - name: Run shard
        run: node --test --test-shard=${{ matrix.shard }}/4 --test-reporter=junit --test-reporter-destination=test-results/junit.xml test/*.test.mjs
      - name: Upload shard results
        uses: actions/upload-artifact@v4
        with:
          name: junit-${{ matrix.shard }}
          path: test-results/

  summary:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: Collect shard results
        uses: actions/download-artifact@v4
        with:
          path: test-results
      - name: Summarise
        run: node scripts/summarize-junit.mjs test-results | tee -a $GITHUB_STEP_SUMMARY

=============== FILE: reports/run-4612.txt ===============
run 4612 - test - pull_request #301 - 08 Sep 2026 09:12 UTC
Conclusion: success

  test (1) ........................... success  2m09s   (225 tests, 0 failing)
  test (2) ........................... success  2m14s   (225 tests, 0 failing)
  test (3) ........................... success  1m57s   (225 tests, 0 failing)
  test (4) ........................... success  2m22s   (225 tests, 0 failing)
  summary ............................ success  0m21s

Artifacts on this run:
  junit-1   4.1 KB   1 file
  junit-2   3.9 KB   1 file
  junit-3   4.4 KB   1 file
  junit-4   4.0 KB   1 file

summary / Collect shard results
  Preparing to download the following artifacts:
  - junit-1 (ID: 88214019, Size: 4198)
  - junit-2 (ID: 88214020, Size: 3992)
  - junit-3 (ID: 88214021, Size: 4501)
  - junit-4 (ID: 88214022, Size: 4096)
  Total of 4 artifact(s) downloaded
  Download artifact has finished successfully

summary / Summarise
  0 tests, 0 failures

=============== FILE: reports/run-4620.txt ===============
run 4620 - test - pull_request #307 - 10 Sep 2026 15:44 UTC
Conclusion: failure

  test (1) ........................... failure  2m31s   (225 tests, 3 failing)
  test (2) ........................... success  2m08s   (225 tests, 0 failing)
  test (3) ........................... failure  2m19s   (225 tests, 1 failing)
  test (4) ........................... success  2m11s   (225 tests, 0 failing)
  summary ............................ skipped  0m00s

Artifacts on this run:
  junit-2   3.9 KB   1 file
  junit-4   4.0 KB   1 file

Comment from @rbhatt: "four job logs to open and no summary, on the one run this
week where I needed one."

=============== FILE: scripts/summarize-junit.mjs ===============
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'test-results';
let tests = 0;
let failures = 0;

for (const name of readdirSync(dir).filter((f) => f.endsWith('.xml'))) {
  const xml = readFileSync(join(dir, name), 'utf8');
  tests += (xml.match(/<testcase/g) ?? []).length;
  failures += (xml.match(/<failure/g) ?? []).length;
}

console.log(`${tests} tests, ${failures} failures`);
if (failures > 0) process.exitCode = 1;

=============== FILE: package.json ===============
{
  "name": "paper-trail",
  "version": "0.9.4",
  "private": true,
  "scripts": {
    "test": "node --test test/*.test.mjs"
  }
}

=============== FILE: src/audit.mjs ===============
export function redact(record, fields) {
  const out = { ...record };
  for (const f of fields) if (f in out) out[f] = '[redacted]';
  return out;
}

export function isRetention(record, now, days) {
  return (now - record.createdAt) / 86400000 >= days;
}

=============== FILE: test/redact.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/audit.mjs';

test('redacts the named fields', () => {
  assert.deepEqual(redact({ a: 1, ssn: '123' }, ['ssn']), { a: 1, ssn: '[redacted]' });
});

test('leaves absent fields alone', () => {
  assert.deepEqual(redact({ a: 1 }, ['ssn']), { a: 1 });
});

=============== FILE: test/immutability.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/audit.mjs';

test('does not mutate the input', () => {
  const input = { ssn: '123' };
  redact(input, ['ssn']);
  assert.equal(input.ssn, '123');
});

test('returns a distinct object', () => {
  const input = { ssn: '123' };
  assert.notEqual(redact(input, ['ssn']), input);
});

=============== FILE: test/retention.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetention } from '../src/audit.mjs';

test('a record past the window is retained', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 40 * 86400000 }, now, 30), true);
});

test('a record inside the window is not', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 5 * 86400000 }, now, 30), false);
});

=============== FILE: test/boundary.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetention } from '../src/audit.mjs';

test('a record exactly on the boundary is retained', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 30 * 86400000 }, now, 30), true);
});

test('a zero-day window retains everything', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now }, now, 0), true);
});
