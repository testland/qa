# Our four breakpoints look like they are fighting over one PNG

## Problem Description

Storefront team. We run the visual suite at four widths - 375, 768, 1280 and
1920 - and in eighteen months it has caught exactly one thing, at 1280. Two
regressions that a customer found for us were live for weeks: the filter
sidebar overlapping the product grid on tablet, and the footer columns
collapsing on very wide monitors. Neither ever turned the job red.

Marco's reading is that the four projects are all writing to the same file, so
each run has four writers and one winner, and whichever project happens to go
last decides what the baseline is - which would explain why only the 1280
project ever seems to be comparing against anything real. He has a branch open
that rewrites the file-path setting to put the pixel width into the name, and
he wants a review on it this afternoon.

Nadia wants to delete the 1920 project in the same PR. Her argument is that it
has never reported a single failure in eighteen months and each project costs
us about nine minutes of runner time on every PR.

Kev's contribution is that whatever we decide, we should re-record every
baseline afterwards so we start from a clean slate.

I have pulled the config, the spec, a listing of what is actually on disk with
each file's pixel dimensions, the bug board and the proposals thread. Tell me
what is actually wrong, then answer all three of them.

## Output Specification

1. Write `docs/breakpoint-matrix.md`: the cause, and a line per project saying
   whether that project is currently exercising the width its name claims.
2. Give the corrected `playwright.config.ts` projects block as code.
3. Say what happens to the twelve committed PNGs, and in what order the steps
   have to happen.
4. Answer Marco, Nadia and Kev each by name, granting or refusing.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 2,
  snapshotPathTemplate: '{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 150,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'tablet-768',
      use: { viewport: { width: 768, height: 1024 }, ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'wide-1920',
      use: { viewport: { width: 1920, height: 1080 }, ...devices['Desktop Chrome'] },
    },
  ],
});

=============== FILE: tests/catalog.spec.ts ===============
import { test, expect } from '@playwright/test';

test('catalog grid', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page).toHaveScreenshot('grid.png');
});

test('catalog filters', async ({ page }) => {
  await page.goto('/catalog?open=filters');
  await expect(page).toHaveScreenshot('filters.png');
});

test('site footer', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('footer.png');
});

=============== FILE: docs/on-disk.txt ===============
$ node tools/matrix.mjs --list tests/catalog.spec.ts-snapshots

tests/catalog.spec.ts-snapshots/filters-1-desktop-1280-linux.png   1280x800   204 KB   2026-09-08
tests/catalog.spec.ts-snapshots/filters-1-mobile-375-linux.png      375x667    61 KB   2026-09-08
tests/catalog.spec.ts-snapshots/filters-1-tablet-768-linux.png     1280x720   198 KB   2026-09-08
tests/catalog.spec.ts-snapshots/filters-1-wide-1920-linux.png      1280x720   197 KB   2026-09-08
tests/catalog.spec.ts-snapshots/footer-1-desktop-1280-linux.png    1280x800   142 KB   2026-08-26
tests/catalog.spec.ts-snapshots/footer-1-mobile-375-linux.png       375x667    48 KB   2026-08-26
tests/catalog.spec.ts-snapshots/footer-1-tablet-768-linux.png      1280x720   139 KB   2026-08-26
tests/catalog.spec.ts-snapshots/footer-1-wide-1920-linux.png       1280x720   139 KB   2026-08-26
tests/catalog.spec.ts-snapshots/grid-1-desktop-1280-linux.png      1280x800   311 KB   2026-09-08
tests/catalog.spec.ts-snapshots/grid-1-mobile-375-linux.png         375x667    96 KB   2026-09-08
tests/catalog.spec.ts-snapshots/grid-1-tablet-768-linux.png        1280x720   305 KB   2026-09-08
tests/catalog.spec.ts-snapshots/grid-1-wide-1920-linux.png         1280x720   304 KB   2026-09-08

12 files, 2.1 MB total.

=============== FILE: docs/proposals.md ===============
# Thread: "why does only desktop-1280 ever fail" - #storefront-quality

**@marco** (2026-09-09 10:02)
Four projects, and the path setting does not pull them apart properly, so they
land on top of each other. One winner per run, and that is the whole bug. Branch
is fix/snapshot-path-width, it rewrites the path setting to
`{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}-w{width}{ext}`.

**@nadia** (2026-09-09 10:31)
While we are in there: kill wide-1920. Eighteen months, zero failures ever
reported by it, nine minutes of runner time per PR, every PR. If a project has
never once told us anything we should not be paying for it.

**@kev** (2026-09-09 10:48)
Whatever lands, we should re-record the whole set afterwards so we are not
carrying whatever those old files contain. One update pass over the suite,
commit, done. Takes four minutes.

**@marco** (2026-09-09 11:05)
Agreed on the re-record. I ran it on my branch already and everything came back
green on the second run, which is a good sign.

=============== FILE: docs/bug-board.md ===============
# Storefront bugs - open

| Id       | Title                                                         | State | Opened     | Found by     |
|----------|---------------------------------------------------------------|-------|------------|--------------|
| SF-834   | Filter sidebar overlaps the product grid between 720 and 900   | open  | 2026-08-19 | customer     |
| FOOT-210 | Footer columns collapse to one column above 1600               | open  | 2026-08-27 | customer     |
| SF-802   | Price badge truncates at 375 when the currency is three chars  | fixed | 2026-07-14 | visual suite |
| SF-796   | Product card shadow doubled on hover at 1280                   | fixed | 2026-06-30 | visual suite |

Planning note, 2026-09-10: SF-834 and FOOT-210 are both unassigned. Both
reproduce every time on a seeded catalog account. Neither has a fix branch.

=============== FILE: tools/matrix.mjs ===============
// Renders a breakpoint matrix from normalized per-project result rows.
// Reporting helper only - it does not capture or compare images.

export function matrixRows(results) {
  const pages = [...new Set(results.map((r) => r.page))].sort();
  const projects = [...new Set(results.map((r) => r.project))];
  return pages.map((page) => ({
    page,
    cells: projects.map((project) => {
      const hit = results.find((r) => r.page === page && r.project === project);
      return { project, status: hit ? hit.status : 'missing' };
    }),
  }));
}

export function renderMatrix(rows) {
  return rows
    .map((r) => '| ' + r.page + ' | ' + r.cells.map((c) => c.status).join(' | ') + ' |')
    .join('\n');
}

=============== FILE: tools/matrix.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrixRows, renderMatrix } from './matrix.mjs';

const RESULTS = [
  { page: '/catalog', project: 'mobile-375', status: 'pass' },
  { page: '/catalog', project: 'tablet-768', status: 'fail' },
  { page: '/cart', project: 'mobile-375', status: 'pass' },
];

test('one row per page', () => {
  assert.equal(matrixRows(RESULTS).length, 2);
});

test('missing cells are reported, not dropped', () => {
  const cart = matrixRows(RESULTS).find((r) => r.page === '/cart');
  assert.equal(cart.cells.find((c) => c.project === 'tablet-768').status, 'missing');
});

test('renders one line per page', () => {
  assert.equal(renderMatrix(matrixRows(RESULTS)).split('\n').length, 2);
});
