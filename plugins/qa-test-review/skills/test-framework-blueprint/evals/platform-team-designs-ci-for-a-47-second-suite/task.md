# Platform drafted our pipeline: 8 shards and 3 retries for 37 tests

## Problem Description

Kestrel Analytics. I own the new test suite - fourteen browser specs and a
small API tier, written over the last six weeks. It is the first automated
suite this product has ever had and I am the only person who has touched it.

Marek on platform has drafted the pipeline for it, in `ci/proposed-matrix.md`,
and wants it merged this week so he can close out the quarter's CI work. It
is eight shards, three retries, three browsers across two runner images. He
has been generous with his time and the config itself is well written.

Two things are bothering me and I want a second opinion before I push back on
someone doing me a favour.

The first is the shards. The whole suite takes 47 seconds on my laptop and
about 1m10s on a runner. I measured a dry run of the split and put it in
`reports/suite-runtime.md`. I cannot work out what the eight shards buy.

The second is the retries. Our runners are spot instances and we lose one to
eviction maybe once a week, which is what Marek says the three retries are
for. But I pulled the last eleven runs off the log and I do not like what the
checkout spec is doing in there.

Separately and maybe unrelated: our test-health dashboard has had nothing in
it for this product since we started. The ingester's message is at the bottom
of the same log.

Give me the reporting and CI part of our conventions document, and the reply
I send Marek.

## Output Specification

1. Write `docs/test-conventions.md` containing a reporting section and a CI
   matrix table with one row per trigger and columns for the suite that runs,
   the shard count, and the retry policy.
2. Write `docs/marek-reply.md` - what I send him, covering every point in his
   draft that I am changing and why.
3. You may edit `playwright.config.ts`. Leave everything under `tests/`,
   `test/` and `src/` exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "kestrel-web",
  "version": "1.2.0",
  "private": true,
  "scripts": {
    "test:api": "node --test \"test/**/*.test.js\"",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.55.0"
  }
}

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/checkout.spec.ts ===============
import { test, expect } from '@playwright/test';

test('checkout: complete a card purchase', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible();
});

test('checkout: rejects an expired card', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4000000000000069');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByRole('alert')).toHaveText('Card expired');
});

=============== FILE: src/rollups.js ===============
'use strict';

function rollup(events, bucketMs) {
  const buckets = new Map();
  for (const e of events) {
    const key = Math.floor(e.t / bucketMs) * bucketMs;
    buckets.set(key, (buckets.get(key) ?? 0) + e.count);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({ t, count }));
}

module.exports = { rollup };

=============== FILE: test/rollups.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rollup } = require('../src/rollups');

test('buckets events to the floor of the interval', () => {
  assert.deepEqual(
    rollup([{ t: 0, count: 1 }, { t: 59, count: 2 }, { t: 60, count: 4 }], 60),
    [{ t: 0, count: 3 }, { t: 60, count: 4 }],
  );
});

test('returns an empty series when there are no events', () => {
  assert.deepEqual(rollup([], 60), []);
});

=============== FILE: ci/proposed-matrix.md ===============
# Proposed CI pipeline - kestrel-web

Author: @marek.z (Platform), drafted 2026-09-07

## Job matrix

    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
        browser: [chromium, firefox, webkit]
        image: [ubuntu-24.04, ubuntu-22.04]

Command per job:

    npx playwright test --project=$BROWSER --shard=$SHARD/8

That is 48 jobs per pipeline run.

## Config changes

- `retries: 3` when CI is set. The runners are spot instances and we lose one
  to eviction roughly once a week; three attempts covers it comfortably.
- `workers: 1` inside each shard, so shards do not contend for CPU.
- Reporter stays `html`. The report directory is uploaded as a build artifact
  and published to the pipeline S3 bucket, where anyone can open it.

## Triggers

The same job runs on every push to every branch, and again nightly. One
definition, no special cases - easier for me to maintain.

=============== FILE: reports/suite-runtime.md ===============
# Suite runtime, measured 2026-09-10

Full suite, one worker, chromium only:

| Tier                          | Specs | Runtime |
|-------------------------------|-------|---------|
| Browser (`tests/`)            | 14    | 41s     |
| API (`test/`, node --test)    | 23    | 6s      |
| Total                         | 37    | 47s     |

The same run on a CI runner is 1m10s. Runner provisioning and the browser
download add a further 55s before the first test starts.

Dry run of `--shard=n/8` across the 14 browser specs:

| Shard | Specs | Test time | Wall time incl. startup |
|-------|-------|-----------|-------------------------|
| 1/8   | 2     | 9s        | 64s                     |
| 2/8   | 2     | 7s        | 62s                     |
| 3/8   | 2     | 6s        | 61s                     |
| 4/8   | 2     | 5s        | 60s                     |
| 5/8   | 2     | 6s        | 61s                     |
| 6/8   | 2     | 4s        | 59s                     |
| 7/8   | 1     | 3s        | 58s                     |
| 8/8   | 1     | 1s        | 56s                     |

The pipeline account is billed per job-minute. Forty-eight jobs of roughly a
minute each replaces one job of roughly two minutes.

=============== FILE: reports/ci-run-log.txt ===============
kestrel-web :: last 11 runs on main, 2026-08-28 to 2026-09-11
retries in effect for this window: 2 (set temporarily by @marek.z while
piloting the pipeline; the committed config still says 0)

run 4471  PASS  checkout: complete a card purchase   attempt 1
run 4478  PASS  checkout: complete a card purchase   attempt 3   <- failed 1, 2
run 4483  PASS  checkout: complete a card purchase   attempt 1
run 4490  PASS  checkout: complete a card purchase   attempt 2   <- failed 1
run 4495  PASS  checkout: complete a card purchase   attempt 3   <- failed 1, 2
run 4501  PASS  checkout: complete a card purchase   attempt 1
run 4507  PASS  checkout: complete a card purchase   attempt 2   <- failed 1
run 4512  PASS  checkout: complete a card purchase   attempt 3   <- failed 1, 2
run 4518  PASS  checkout: complete a card purchase   attempt 1
run 4524  PASS  checkout: complete a card purchase   attempt 1
run 4531  PASS  checkout: complete a card purchase   attempt 2   <- failed 1

  first-attempt failures for this spec: 6 of 11 runs (54.5%)
  every failed attempt: TimeoutError waiting for getByTestId('order-confirmation')
  the pipeline reported green on all 11 runs
  no other spec failed an attempt in this window

runner evictions in the same window: 0
  last eviction was 2026-08-19, run 4402. The whole job was lost before any
  test started; the pipeline re-queued the job and the second job passed.

--- test-health dashboard ingest, nightly since 2026-08-01 ---
[ingest] kestrel-web: scanning build artifact bundle
[ingest] kestrel-web: no JUnit XML found (looked for **/results.xml, **/junit*.xml)
[ingest] kestrel-web: 0 results recorded; this suite will not appear on the dashboard
[ingest] kestrel-web: 41 consecutive nights with no results
