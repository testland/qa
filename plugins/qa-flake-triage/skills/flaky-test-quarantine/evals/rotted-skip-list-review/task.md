# Nobody has looked at the skip list since March

## Problem Description

We keep a markdown file listing every test we have switched off, and the
matching annotations live in the specs. It was working for about two months
and then it stopped being maintained. There are five entries. At least one has
been sitting there since December.

The reason it came up: an auditor asked us how many tests in our suite do not
actually run, and we could not answer without reading the specs by hand. Two of
the five have dates that have already gone by, one has no date at all, and one
of them I am fairly sure was fixed weeks ago and we just never turned the test
back on.

The proposal on the table from our engineering manager is to push every date
out ninety days from today so the list is "clean" again, and then set a
reminder. Today is 2026-08-17.

I would rather do this properly once. Some of these should probably not be on
the list any more at all.

## Output Specification

1. Write `docs/skip-review-2026-08-17.md` — a verdict for each of the five
   entries with the reasoning, in the same order as the log.
2. Rewrite `docs/skipped-tests.md` so it reflects the state after your
   decisions. Entries that should no longer be on it must not be on it.
3. Edit `tests/e2e.spec.ts` to match your decisions.
4. Do not change any test body. If a test should go back into the blocking
   path, only the annotation is removed.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/skipped-tests.md ===============
# Tests currently switched off

| ID   | Test                          | Off since  | Re-check by | Times extended | Ticket | Owner |
|------|-------------------------------|------------|-------------|----------------|--------|-------|
| Q-01 | checkout applies regional tax | 2025-12-08 | 2026-03-08  | 2              | #3120  |       |
| Q-02 | search returns paged results  | 2026-07-28 | 2026-08-27  | 0              | #5501  | @search |
| Q-03 | notification digest sends     | 2026-06-01 | 2026-07-01  | 1              | #4412  | @messaging |
| Q-04 | legacy csv import parses      | 2026-03-14 |             | 0              |        |       |
| Q-05 | dashboard widgets load        | 2026-07-20 | 2026-08-10  | 1              | #5388  | @web-platform |

Notes kept by hand:

- Q-01: fails about 14% of runs, cause never found. Two people tried. The team
  that owned it (@growth) was folded into @web-platform in February.
- Q-02: fails about 7% of runs, indexer race, @search has a fix in review.
- Q-03: #4412 was closed as fixed and shipped on 2026-07-20.
- Q-04: the CSV import feature was removed from the product in the 5.2 release
  (2026-05-19). The test still exists.
- Q-05: fails about 9% of runs. #5388 is open, @web-platform started on it last
  week and expects to land something within two weeks.

=============== FILE: tests/e2e.spec.ts ===============
import { test, expect } from '@playwright/test';

test('checkout applies regional tax', async ({ page }) => {
  test.fixme(true, 'Off since 2025-12-08 (#3120). Re-check by 2026-03-08.');
  await page.goto('/cart');
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  test.fixme(true, 'Off since 2026-07-28 (#5501) - fails ~7% of runs; indexer race. Re-check by 2026-08-27. Owner: @search.');
  await page.goto('/search?q=widget');
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('notification digest sends', async ({ page }) => {
  test.fixme(true, 'Off since 2026-06-01 (#4412). Re-check by 2026-07-01. Owner: @messaging.');
  await page.goto('/settings/notifications');
  await expect(page.getByText('Daily digest queued')).toBeVisible();
});

test('legacy csv import parses', async ({ page }) => {
  test.fixme(true, 'Off since 2026-03-14. Flaky.');
  await page.goto('/import');
  await page.setInputFiles('input[type=file]', 'fixtures/rows.csv');
  await expect(page.getByText('312 rows imported')).toBeVisible();
});

test('dashboard widgets load', async ({ page }) => {
  test.fixme(true, 'Off since 2026-07-20 (#5388) - fails ~9% of runs. Re-check by 2026-08-10. Owner: @web-platform.');
  await page.goto('/dashboard');
  await expect(page.getByTestId('widget-grid')).toBeVisible();
});
