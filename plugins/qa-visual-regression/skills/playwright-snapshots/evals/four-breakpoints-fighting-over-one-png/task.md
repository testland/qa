# Storefront visual checks flip pass/fail depending on which shard runs them

## Problem Description

Six weeks ago we widened the storefront visual coverage from "desktop only" to
four viewport widths, because the whole point of the redesign was that the
product page had to hold up at 375 through 1920. The change went in on
2026-07-29 and nobody has trusted the result since.

What we actually see:

- `tests/product-detail.spec.ts` goes red roughly one run in three, and which of
  the three checks goes red changes run to run. Re-running the job usually
  clears it, so people re-run.
- The committed PNG files keep changing **dimensions** between PRs. Somebody
  went through the history: `gallery.png` has been 375x667 in seven of the last
  fourteen PRs and 1280x800 in the other seven, and no PR in that window touched
  the gallery component.
- Chloe on design filed a bug on 2026-09-02 saying the tablet layout has had an
  overlapping price badge "for about a month". We went back and looked - every
  visual job in that month was green on the runs it passed. Nothing flagged it.

Ed added `retries: 3` in mid-August to stop the re-run requests, which reduced
the noise in the Slack channel and did nothing else.

I want the four widths independently checked, so that a tablet-only regression
is a tablet-only failure and I can tell from the job which width broke. I also
need to know what happens to the three PNG files currently committed, because I
do not believe any of them is a baseline for anything in particular. Marco's
suggestion is that we keep them and just rename each one to whichever width its
dimensions match, which would save us re-shooting three images.

Once the config is right I want to run the update job once, commit whatever
comes out, and be done with this before the sprint closes on Friday - so give me
the exact command sequence to run.

The repo, the config, a summary of what is on disk, the run history and the open
storefront bugs are attached.

## Output Specification

1. Edit `playwright.config.ts` so each of the four viewport widths is checked
   against its own baseline. Do not add or remove viewport widths.
2. Write `docs/breakpoint-baselines.md`: what was actually wrong, what has to
   happen to the three PNG files currently in `tests/__screens__/`, the exact
   command sequence to re-establish baselines, and the number of baseline files
   this suite should hold when it is correct versus the number it holds today.
3. Leave `tools/` alone. `node --test` must still pass from the repo root when
   you are finished.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: 3,
  reporter: [['html', { outputFolder: 'playwright-report' }]],

  snapshotPathTemplate: 'tests/__screens__/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 400,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: 'http://localhost:4173',
  },

  projects: [
    { name: 'mobile-375',   use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 667  } } },
    { name: 'tablet-768',   use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800  } } },
    { name: 'wide-1920',    use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
});

=============== FILE: tests/product-detail.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/p/aurora-desk-lamp');
  await page.getByRole('heading', { name: 'Aurora Desk Lamp' }).waitFor();
});

test('gallery', async ({ page }) => {
  await expect(page.locator('[data-region="gallery"]')).toHaveScreenshot('gallery.png');
});

test('buy box', async ({ page }) => {
  await expect(page.locator('[data-region="buy-box"]')).toHaveScreenshot('buy-box.png');
});

test('spec table', async ({ page }) => {
  await expect(page.locator('[data-region="spec-table"]')).toHaveScreenshot('spec-table.png');
});

=============== FILE: docs/on-disk.md ===============
# What is actually committed under tests/__screens__

`git ls-files tests/__screens__` on 2026-09-11:

```
tests/__screens__/buy-box.png
tests/__screens__/gallery.png
tests/__screens__/spec-table.png
```

Three files. Image dimensions as committed today:

| File            | Dimensions  | Last rewritten by |
|-----------------|-------------|-------------------|
| gallery.png     | 1280 x 800  | PR #3318          |
| buy-box.png     | 375 x 667   | PR #3318          |
| spec-table.png  | 1920 x 1080 | PR #3305          |

Nobody has been able to explain why one PR rewrote two of them at two different
sizes.

=============== FILE: docs/ci-history.md ===============
# visual job, last 12 runs on main

| Run  | Date       | Failed checks                                     | Outcome after re-run |
|------|------------|---------------------------------------------------|----------------------|
| 4471 | 2026-09-10 | gallery (tablet-768, wide-1920)                   | green                |
| 4468 | 2026-09-10 | none                                              | -                    |
| 4463 | 2026-09-09 | buy box (desktop-1280), gallery (mobile-375)      | green                |
| 4459 | 2026-09-08 | none                                              | -                    |
| 4455 | 2026-09-08 | spec table (mobile-375, tablet-768, desktop-1280) | green                |
| 4450 | 2026-09-05 | none                                              | -                    |
| 4446 | 2026-09-04 | gallery (desktop-1280)                            | green                |
| 4441 | 2026-09-04 | none                                              | -                    |
| 4437 | 2026-09-03 | buy box (tablet-768, wide-1920, mobile-375)       | green                |
| 4433 | 2026-09-02 | none                                              | -                    |
| 4430 | 2026-09-02 | spec table (wide-1920)                            | green                |
| 4425 | 2026-09-01 | gallery (tablet-768)                              | green                |

Notes from Ed, 2026-08-14: "Which project fails looks random to me. `retries: 3`
makes most of them go away."

Runner: `ubuntu-latest`. Everyone on the team develops on Linux today; two of us
are picking up MacBooks in October.

=============== FILE: docs/storefront-bugs.md ===============
# Open storefront bugs, 2026-09-11

| ID       | Opened     | Title                                                                 | Assignee | State |
|----------|------------|-----------------------------------------------------------------------|----------|-------|
| SF-812   | 2026-08-18 | Wishlist heart loses its fill state after navigating back              | @dpatel  | open  |
| SF-829   | 2026-08-27 | Size selector announces the wrong option to screen readers             | -        | open  |
| SF-834   | 2026-09-02 | Price badge overlaps the "Add to basket" button in the buy box between 720px and 900px wide; reproduces on every product page, every browser | - | open, unassigned |
| SF-841   | 2026-09-06 | Gallery thumbnails load at full resolution on slow connections         | @rlau    | open  |
| SF-848   | 2026-09-09 | Spec table header does not stick while scrolling on long specs         | -        | open  |

Backlog note from the 2026-09-10 planning session: SF-834 was not pulled into
this sprint. Design has the fix sketched, engineering has not scheduled it.

=============== FILE: tools/run-summary.mjs ===============
export function rollUpByDay(rows) {
  const byDay = new Map();
  for (const row of rows) {
    const day = byDay.get(row.date) ?? { date: row.date, red: 0, green: 0 };
    if (row.failed > 0) day.red += 1;
    else day.green += 1;
    byDay.set(row.date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function redRate(days) {
  const red = days.reduce((n, d) => n + d.red, 0);
  const total = days.reduce((n, d) => n + d.red + d.green, 0);
  return total === 0 ? 0 : Math.round((red / total) * 100);
}

=============== FILE: tools/run-summary.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollUpByDay, redRate } from './run-summary.mjs';

const rows = [
  { date: '2026-09-02', failed: 1 },
  { date: '2026-09-02', failed: 0 },
  { date: '2026-09-01', failed: 1 },
];

test('groups runs by day and counts outcomes', () => {
  assert.deepEqual(rollUpByDay(rows), [
    { date: '2026-09-01', red: 1, green: 0 },
    { date: '2026-09-02', red: 1, green: 1 },
  ]);
});

test('red rate is a whole percentage of all runs', () => {
  assert.equal(redRate(rollUpByDay(rows)), 67);
});

test('an empty history has no red rate', () => {
  assert.equal(redRate([]), 0);
});

test('an all-green history reports zero', () => {
  assert.equal(redRate(rollUpByDay([{ date: '2026-09-03', failed: 0 }])), 0);
});
