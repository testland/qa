# We switch tests off and then nothing ever tells us to look again

## Problem Description

Over the last year we have taken tests out of the blocking path whenever they
got in the way. The mechanics work — the annotation goes in, the trunk goes
green, the PR merges. What does not work is the other end. There is no moment
at which anybody is told to look at one of these again. We find them when
somebody happens to open the file.

Four are in the file right now. They were written by four different people and
no two of them are in the same shape. One has a note and no dates at all. One
has a date that went by in March.

What we want is for this to surface on its own, on a schedule, without anybody
remembering to check. Today is 2026-08-17. Our CI is GitHub Actions and the
e2e workflow is attached.

Two things our staff engineer flagged when we discussed it. First, do not build
something that fails the e2e job when a switched-off test goes stale — that
just puts us back to a red trunk, which is why they were switched off in the
first place. Second, whatever surfaces the stale ones must not act on them by
itself; a person decides what happens to a test, not a cron job.

## Output Specification

1. Produce whatever files make the stale ones surface on a schedule. Give exact
   paths. It must run on GitHub Actions and be manually triggerable.
2. Edit `tests/e2e.spec.ts` so the four existing annotations are consistent and
   your mechanism can read them. Do not change any test body and do not put any
   test back into the blocking path in this change.
3. Write `docs/skip-format.md` — the format the next person has to follow, with
   an example, short enough that they will actually read it.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/e2e.spec.ts ===============
import { test, expect } from '@playwright/test';

test('checkout applies regional tax', async ({ page }) => {
  test.fixme(true, 'flaky on tablet, see #3120');
  await page.goto('/cart');
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  test.fixme(true, 'Off 2026-02-11 (#4001) - fails ~7% of runs; indexer race. Look again by 2026-03-13. Owner: @search.');
  await page.goto('/search?q=widget');
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('notification digest sends', async ({ page }) => {
  test.skip(true, 'temporarily disabled while the queue work lands - jamie, july');
  await page.goto('/settings/notifications');
  await expect(page.getByText('Daily digest queued')).toBeVisible();
});

test('dashboard widgets load', async ({ page }) => {
  test.fixme(true, 'Quarantined 2026-08-04 (#5388) - fails ~9% of runs. Re-evaluate by 2026-09-03. Owner: @web-platform.');
  await page.goto('/dashboard');
  await expect(page.getByTestId('widget-grid')).toBeVisible();
});

test('order list paginates', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByTestId('page-indicator')).toHaveText('1 of 9');
});

=============== FILE: .github/workflows/e2e.yml ===============
name: e2e

on:
  pull_request:
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

=============== FILE: docs/notes.md ===============
Ownership, from the last time anyone checked:

- checkout/*  -> @web-platform (lead @kdavies)
- search/*    -> @search (lead @nrahimi)
- settings/*  -> @messaging (lead @tobrien); "jamie" is @jrivera on @messaging
- dashboard/* -> @web-platform (lead @kdavies)

#3120 open. #4001 open, no activity since April. #5388 open, active.
The queue work Jamie mentioned shipped on 2026-07-29.
