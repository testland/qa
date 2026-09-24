# Platform drafted our pipeline and I only object to one line of it

## Problem Description

Kestrel Analytics. I own the new test suite - fourteen browser specs and a
small API tier, written over the last six weeks. It is the first automated
suite this product has ever had and I am the only person who has touched it.

Marek on platform has drafted the pipeline for it, in `ci/proposed-matrix.md`,
and wants it merged this week so he can close out the quarter's CI work. It
is eight shards, three retries, three browsers across two runner images. He
has been generous with his time and the config itself is better written than
anything I would have produced.

The retries I am honestly fine with. Our runners are spot instances, we lose
one most weeks, and Marek is right that a pipeline which goes red because
Amazon took the machine back is worse than one that tries again. If anything
I would have asked for them myself.

What I cannot make sense of is the eight shards. The whole suite takes 47
seconds on my laptop and about 1m10s on a runner. I measured a dry run of the
split and put it in `reports/suite-runtime.md`. I want to push back on that
part without sounding ungrateful, and I would like the reasoning to be tight
before I do, because Marek will have thought about it more than I have.

Attached: his draft, my runtime measurements, the raw attempt records off the
last two weeks on main, and the ingest status file platform circulated last
month. Plus the repo - `npm run test:api` passes.

Give me the reporting and CI part of our conventions document, and the reply
I send Marek.

## Output Specification

1. Write `docs/test-conventions.md` containing a reporting section and a CI
   matrix table.
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

## Runner image

Browser binaries are baked into a custom image, so the 55 seconds of
`playwright install` per job goes away. This is already built and available
as `ghcr.io/kestrel/ci-playwright:1.55.0`.

`fail-fast: false` because one shard going red should not cancel the other
forty-seven - you want the whole picture on a failing run, not the first
failure.

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
download add a further 55s before the first test starts; on Marek's baked
image the browser download part of that is gone.

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

The pipeline account is billed per job-minute.

=============== FILE: reports/attempt-records.txt ===============
kestrel-web :: raw attempt records, main branch, 2026-08-28 to 2026-09-11
retries in effect for this window: 2 (set temporarily by @marek.z while
piloting the pipeline; the committed config still says 0)

--- run roster ---
run 4471  2026-08-28  completed  green
run 4478  2026-08-29  completed  green
run 4483  2026-08-31  completed  green
run 4490  2026-09-01  completed  green
run 4495  2026-09-02  completed  green
run 4501  2026-09-03  completed  green
run 4505  2026-09-05  job lost   runner reclaimed 00:38 into the job, no tests started, re-queued by hand as 4506 (green)
run 4507  2026-09-05  completed  green
run 4512  2026-09-08  completed  green
run 4514  2026-09-09  job lost   runner reclaimed 00:22 into the job, no tests started, re-queued by hand as 4515 (green)
run 4518  2026-09-09  completed  green
run 4524  2026-09-10  completed  green
run 4531  2026-09-11  completed  green

--- attempt records: every attempt that did not pass on the first try ---
run 4478  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4478  attempt 2  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4478  attempt 3  checkout: complete a card purchase   passed
run 4490  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4490  attempt 2  checkout: complete a card purchase   passed
run 4495  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4495  attempt 2  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4495  attempt 3  checkout: complete a card purchase   passed
run 4501  attempt 1  cart: applies a promo code           failed   AssertionError: expected "12.00" received "15.00"
run 4501  attempt 2  cart: applies a promo code           passed
run 4507  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4507  attempt 2  checkout: complete a card purchase   passed
run 4512  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4512  attempt 2  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4512  attempt 3  checkout: complete a card purchase   passed
run 4531  attempt 1  checkout: complete a card purchase   failed   TimeoutError: expect(getByTestId('order-confirmation')).toBeVisible() timed out 5000ms
run 4531  attempt 2  checkout: complete a card purchase   passed

(no other attempt in this window failed; every other spec passed on attempt 1
in every completed run)

=============== FILE: platform/test-health-ingest.md ===============
# Org test-health dashboard - ingest status

Every product in the company reports its test results into one dashboard.
Reporting into it is a platform requirement rather than a preference
(PLAT-118); it is where release sign-off reads pass rates, per-test history
and flake ranking from. The ingester runs nightly against each product's
build-artifact bundle and has not changed this year.

Latest nightly output for this product:

    [ingest] kestrel-web: fetching build artifact bundle for run 4531
    [ingest] kestrel-web: bundle contains playwright-report/index.html,
             playwright-report/data/3f2a91c4.zip, playwright-report/assets/*
    [ingest] kestrel-web: no machine-readable test results found in bundle
    [ingest] kestrel-web: 0 tests recorded
    [ingest] kestrel-web: 41 consecutive nights with no results for this product

For comparison, the four other products on this pipeline account all ingest
cleanly and have per-test history going back to 2024.
