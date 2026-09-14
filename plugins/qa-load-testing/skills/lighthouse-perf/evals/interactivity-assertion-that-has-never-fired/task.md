# Fourteen months, zero failures on the input-delay check, and Android users say the app hangs

## Problem Description

Ardent Books — reading app, web plus a wrapped mobile shell. Our per-PR
performance job was set up in July 2025 by someone who has since left; the
config came out of a blog post he linked in the PR description and nobody has
touched it since.

Here is what is bothering me. Support has a steady stream of tickets saying that
tapping **Add to shelf** on a book page does nothing for a second or two and
then fires twice. All of them are Android. Our job has never failed on the
input-delay assertion. Not once in fourteen months, across roughly 2,300 runs.
The loading and layout assertions in the same file have failed nineteen times
between them in that period, so the job itself clearly works.

Two things are on the table and honestly I want both.

- **Marcus:** "The threshold is just too generous. Drop it from 100ms to 50ms
  and it will finally start catching things." He wants it merged today.
- **Sana** already has a branch up that switches the run to the mobile preset.
  One line; the diff is attached. Seventy-one percent of our sessions are phones
  and every one of these tickets is from a phone, so as far as I am concerned
  that one is overdue.

Marcus does not like Sana's branch. His argument is that our runner is a Linux
box with a real CPU and a real network, so anything we ask it to simulate is
made-up numbers, and made-up numbers are worse than none.

My plan is to merge Sana's branch and take the threshold to 50ms in the same PR
and have the whole thing done before standup. That is what I am going to do
unless somebody gives me a better answer this afternoon. I have attached the
assertion history off the job, the metrics block out of one of last week's
stored reports, and our device mix.

## Output Specification

1. Make whatever changes to the job you think are right. Any configuration file
   at the project root stays a CommonJS `.js` file.
2. Update `.github/workflows/perf.yml` if your change needs it.
3. Write `docs/perf-job-findings.md`: what the evidence shows, a direct answer to
   Marcus and to Sana, and what you changed.
4. Do not modify anything under `test/`. `npm test` must still pass.

## Input Files

Extract the following files before beginning.

=============== FILE: .lighthouserc.js ===============
// From https://blog.example.dev/lighthouse-ci-in-anger (2022). Untouched since 2025-07-09.
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:8080/',
        'http://localhost:8080/book/9780143127741',
        'http://localhost:8080/shelf',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'serving on',
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

=============== FILE: patches/sana-mobile-preset.diff ===============
branch: sana/mobile-preset
1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/.lighthouserc.js b/.lighthouserc.js
index 3f9a2c1..b7d41e0 100644
--- a/.lighthouserc.js
+++ b/.lighthouserc.js
@@ -12,7 +12,7 @@ module.exports = {
       numberOfRuns: 3,
       settings: {
-        preset: 'desktop',
+        preset: 'mobile',
         chromeFlags: '--no-sandbox',
       },
       startServerCommand: 'npm run start',

=============== FILE: reports/assertion-history.md ===============
# Per-assertion outcomes, perf job, 2025-07-09 through 2026-09-11

2,311 runs.

| Assertion in the config    | Runs where it failed | Last failure | Notes |
|----------------------------|----------------------|--------------|-------|
| `first-contentful-paint`   | 2                    | 2026-02-03   | Both from the same PR that inlined a 900 kB hero. |
| `largest-contentful-paint` | 13                   | 2026-08-27   | Reverted or fixed each time. |
| `cumulative-layout-shift`  | 4                    | 2026-06-14   | Three were the cover-image placeholder. |
| `first-input-delay`        | 0                    | never        | |

=============== FILE: reports/last-run-metrics.md ===============
# Metrics block from a stored report, PR #2841, 2026-09-08

Desktop run against `/book/9780143127741`, median of 3.

| Metric                    | Value  |
|---------------------------|--------|
| First Contentful Paint    | 1.4 s  |
| Largest Contentful Paint  | 2.1 s  |
| Total Blocking Time       | 180 ms |
| Cumulative Layout Shift   | 0.02   |
| Speed Index               | 1.9 s  |

I pulled the same block out of stored reports from March and from June and it
has the same five rows in it.

=============== FILE: analytics/device-mix.md ===============
# Sessions, 28-day window ending 2026-09-08

| Device class            | Share | Notes |
|-------------------------|-------|-------|
| Android phone           | 44%   | Median device is a mid-range Android, 4 GB RAM, 2-year-old SoC. |
| iPhone                  | 27%   | |
| Desktop / laptop        | 26%   | |
| Tablet                  | 3%    | |

Connection class, phone sessions only: 52% 4G, 31% wifi, 14% 3G-class, 3% 5G.

All 61 "Add to shelf" tickets since January are Android phone sessions. None are
desktop. The button dispatches a handler that re-sorts the full shelf list in
the main thread before it persists anything; the shelf list is 400+ items for
our heaviest users.

=============== FILE: .github/workflows/perf.yml ===============
name: perf

on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run build

      - run: npx lhci autorun

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-reports
          path: .lighthouseci/
          retention-days: 14

=============== FILE: package.json ===============
{
  "name": "ardent-books-web",
  "version": "5.0.3",
  "private": true,
  "scripts": {
    "build": "node scripts/build.js",
    "start": "node scripts/serve.js",
    "test": "node --test"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}

=============== FILE: src/reading-time.js ===============
'use strict';

const WORDS_PER_MINUTE = 238;

function readingTimeMinutes(wordCount) {
  if (!Number.isInteger(wordCount) || wordCount < 0) throw new RangeError('bad word count');
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

module.exports = { readingTimeMinutes, WORDS_PER_MINUTE };

=============== FILE: test/reading-time.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/reading-time.js');

test('a typical chapter rounds to whole minutes', () => {
  assert.equal(readingTimeMinutes(2380), 10);
});

test('a very short text still reads as one minute', () => {
  assert.equal(readingTimeMinutes(12), 1);
});

test('zero words is one minute, not zero', () => {
  assert.equal(readingTimeMinutes(0), 1);
});

test('a non-integer word count throws', () => {
  assert.throws(() => readingTimeMinutes(12.5), RangeError);
});

=============== FILE: test/lighthouserc.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../.lighthouserc.js');

test('config exposes a ci block with a collect section', () => {
  assert.ok(config.ci, 'ci block missing');
  assert.ok(config.ci.collect, 'ci.collect missing');
});

test('every collected url parses', () => {
  const urls = config.ci.collect.url;
  assert.ok(Array.isArray(urls) && urls.length > 0, 'collect.url must be a non-empty array');
  for (const u of urls) assert.doesNotThrow(() => new URL(u), 'unparseable url: ' + u);
});
