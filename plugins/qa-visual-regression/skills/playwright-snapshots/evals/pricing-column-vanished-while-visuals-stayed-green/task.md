# A whole pricing column was missing for four days and the job stayed green

## Problem Description

INC-2214. Between 2026-09-01 and 2026-09-04 the Business column was absent from
/pricing for every signed-out visitor. Sales found it. Support found it. The
visual job ran 61 times across those four days and was green on all 61.

I need to know what to change so the next one of these turns something red, and
I need it today because the incident review is Tuesday and I would rather bring
a fix than a narrative.

The thread has four suggestions in it and Sasha's is the one everybody has
already agreed with. Nina wants the pricing grid covered up because the price
experiment keeps moving it. Ravi wants the check deleted outright on the grounds
that it has demonstrably never worked.

What I am attaching: the config, the pricing spec, the incident record with the
numbers our reporter produced when we re-ran the comparison by hand afterwards,
the history of every change to the tolerance block, a note on what is actually
on that page, and the thread.

Be blunt if any of the four suggestions are wrong. Two of the people in that
thread outrank me and I would rather be corrected now than on Tuesday.

## Output Specification

1. Write `docs/inc-2214-visual-fix.md`: why 61 runs passed, stated in numbers
   against the capture we actually take.
2. Give the corrected `expect` block as code, and show the arithmetic that says
   the new values would have failed on 2026-09-01.
3. Grant or refuse each of the four suggestions by author name.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 2,

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 400000,
      threshold: 0.55,
      animations: 'allow',
    },
  },

  projects: [
    { name: 'app',       use: { ...devices['Desktop Chrome'] } },
    { name: 'marketing', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/pricing.spec.ts ===============
import { test, expect } from '@playwright/test';

test('pricing page', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
});

test('pricing page annual toggle', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('switch', { name: 'Annual billing' }).click();
  await expect(page).toHaveScreenshot('pricing-annual.png', { fullPage: true });
});

=============== FILE: docs/inc-2214.md ===============
# INC-2214 - Business column absent from /pricing

Window: 2026-09-01 08:40 UTC to 2026-09-04 16:05 UTC.
Cause: flag `pricing.tiers.v3` rolled to 100% with the Business tier omitted
from the tier list. Reverted 2026-09-04.

Visual job: 61 runs in the window, 61 green, 0 red.

After the revert we re-ran the comparison by hand against the baseline that was
live during the incident, using the actual page as captured on 2026-09-01:

```
pricing.png        expected 1280x2400   actual 1280x2400
                   191204 differing pixels
                   largest differing region: x 616..904, y 712..1352

pricing-annual.png expected 1280x2400   actual 1280x2400
                   188937 differing pixels
```

No error was raised for either. Both were reported as passing.

=============== FILE: docs/tolerance-history.md ===============
# git log -p on the expect block in playwright.config.ts

2026-01-14  f19ac02  "initial visual config"
            maxDiffPixels: 100, threshold: 0.2, animations: 'disabled'

2026-02-20  8bd3d51  "pricing is flaky in CI, give it room"
            maxDiffPixels: 100 -> 800

2026-03-30  c4470ae  "still flaky, the logo strip never settles"
            maxDiffPixels: 800 -> 5000
            animations: 'disabled' -> 'allow'

2026-05-06  7712fbb  "testimonial rotation, raising again"
            maxDiffPixels: 5000 -> 60000
            threshold: 0.2 -> 0.35

2026-06-25  a0d8e19  "pricing red three times this week, nobody has time"
            maxDiffPixels: 60000 -> 400000
            threshold: 0.35 -> 0.55

No change since 2026-06-25. The pricing checks have not failed since.

=============== FILE: docs/pricing-page-notes.md ===============
# What is on /pricing

Captured full page at 1280 wide. Rendered height has been 2400 since March.

| Region                | Box (x, y, w, h)        | Notes                                        |
|-----------------------|-------------------------|----------------------------------------------|
| Nav                   | 0, 0, 1280, 72          | Static.                                       |
| Headline block        | 0, 72, 1280, 240        | Static.                                       |
| Tier grid             | 40, 712, 1200, 640      | Four fixed slots, 288 wide each, 16px gutters. |
| Business slot         | 616, 712, 288, 640      | Third slot in the grid.                       |
| Logo ticker           | 0, 1420, 1280, 64       | Scrolls continuously, never settles.          |
| Testimonial strip     | 0, 1560, 1280, 180      | Rotates through 6 quotes on a 5s timer.       |
| Comparison table      | 0, 1800, 1280, 500      | Static.                                       |
| Footer                | 0, 2320, 1280, 80       | Static.                                       |

The tier grid uses fixed slots, so a tier that does not render leaves its slot
empty rather than reflowing the ones beside it.

=============== FILE: docs/proposals.md ===============
# Thread: "INC-2214 - why was the visual job green" - #web-quality

**@sasha** (2026-09-05 09:12, Director of Engineering)
I looked this up. The per-image setting is the fraction of the image we allow to
differ. Ours is at 0.55, which means we are tolerating fifty-five percent of the
page changing before anything complains. One column is nowhere near half a page,
so of course it sailed through. Take it to 0.15 and we would have caught this on
the first run.

**@sasha** (2026-09-05 09:15)
Separately, push it to 0.8 on the marketing project. Their hero gradient dithers
differently on every capture and they are tired of being paged about it.

**@nina** (2026-09-05 09:41, Head of Web)
The tier grid moves constantly because of the price experiment. Cover the whole
grid so it stops producing noise, and then the rest of the page is a stable
comparison we can actually trust.

**@ravi** (2026-09-05 10:02)
Or we accept that this check has never caught anything in nine months and delete
it. We are paying runner time for a green light that means nothing.

=============== FILE: tools/diff-report.mjs ===============
// Formats per-image comparison rows for the PR comment.
// Reporting helper only - it does not capture or compare images.

export function formatRow(row) {
  const pct = ((row.diffPixels / (row.width * row.height)) * 100).toFixed(2);
  return `${row.name} | ${row.width}x${row.height} | ${row.diffPixels} | ${pct}%`;
}

export function summarize(rows) {
  return {
    images: rows.length,
    totalDiffPixels: rows.reduce((n, r) => n + r.diffPixels, 0),
    largest: rows.reduce((best, r) => (r.diffPixels > best.diffPixels ? r : best), rows[0]),
  };
}

=============== FILE: tools/diff-report.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRow, summarize } from './diff-report.mjs';

const ROWS = [
  { name: 'a.png', width: 100, height: 100, diffPixels: 250 },
  { name: 'b.png', width: 100, height: 100, diffPixels: 1000 },
];

test('formats a row with a percentage', () => {
  assert.equal(formatRow(ROWS[0]), 'a.png | 100x100 | 250 | 2.50%');
});

test('summarizes a set of rows', () => {
  const s = summarize(ROWS);
  assert.equal(s.images, 2);
  assert.equal(s.totalDiffPixels, 1250);
  assert.equal(s.largest.name, 'b.png');
});
