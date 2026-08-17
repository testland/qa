# Image comparison fails on things nobody changed

## Problem Description

`tests/dashboard-visual.spec.ts` captures the dashboard and compares the bytes
against a file we committed. It has not been green in CI since February, so the
team runs it locally, eyeballs it, and moves on. It is not catching anything.

There are four moving parts on that page that have nothing to do with the layout
we care about: a "Last synced 3 minutes ago" line, a promo strip that rotates
through three messages, the signed-in user's avatar which is loaded from an
external image host, and cards that fade in over about 400ms after the data
arrives.

There is also a platform problem. The committed files were produced on a
designer's Mac. The CI runners are Linux. Font rendering is not the same, so
even a page with none of the above would not match.

When it does fail we get "expected 0, received -1" and a byte count. Nobody can
tell from that whether anything actually looks different, and there is no
recorded procedure for refreshing the files after an intentional design change -
people copy them out of a local run by hand.

We are not changing the application. The timestamp, the promo strip, the avatar
and the animation all stay.

## Output Specification

1. Replace the hand-rolled capture-and-compare with the comparison the test
   runner performs itself, so that a failure produces a viewable
   expected / actual / difference set instead of a byte count, and so that
   refreshing the reference images is a documented command rather than a manual
   copy.
2. The four volatile regions must be excluded from the comparison. Excluding
   them is the fix; loosening the comparison until it passes is not.
3. Nothing may still be animating or still loading at the moment the image is
   taken.
4. A small allowance for antialiasing differences is reasonable. If you set one,
   state the number and keep it small enough that a genuine layout break still
   fails.
5. Write `docs/visual-testing.md` (20 lines or fewer) covering how a reference
   image is produced, why a Mac-produced file must never become the CI
   reference, and the exact command to run after an intentional design change.
6. Keep both existing checks - the populated dashboard and the empty state.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/dashboard-visual.spec.ts ===============
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASELINES = path.join(__dirname, '..', 'baselines');

test('dashboard layout', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  const actual = await page.screenshot({ fullPage: true });
  const expected = fs.readFileSync(path.join(BASELINES, 'dashboard.png'));
  expect(Buffer.compare(actual, expected)).toBe(0);
});

test('empty state layout', async ({ page }) => {
  await page.goto('/dashboard?seed=empty');
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  const actual = await page.screenshot({ fullPage: true });
  const expected = fs.readFileSync(path.join(BASELINES, 'dashboard-empty.png'));
  expect(Buffer.compare(actual, expected)).toBe(0);
});

=============== FILE: fixtures/dashboard-rendered.html ===============
<!-- what /dashboard renders; reference only, not editable -->
<header>
  <h1>Overview</h1>
  <p data-testid="last-synced">Last synced 3 minutes ago</p>
  <img data-testid="user-avatar" src="https://avatars.example.net/u/8812?s=64" alt="Dana Reed" />
</header>

<section data-testid="promo-strip" class="promo">
  <p>Invite your team and get two months free</p>
</section>

<section class="cards fade-in">
  <article class="card"><h2>Revenue</h2><p>£48,200</p></article>
  <article class="card"><h2>Active users</h2><p>1,914</p></article>
  <article class="card"><h2>Churn</h2><p>2.1%</p></article>
</section>

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
