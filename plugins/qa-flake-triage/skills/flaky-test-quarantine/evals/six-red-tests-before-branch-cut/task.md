# Six red tests and a release branch cut tomorrow

## Problem Description

We cut the 4.8 release branch tomorrow morning. The end-to-end job on `main`
has been red or amber every day this week, and it is red for six different
tests, not one. Nobody trusts the pipeline any more, so people re-run it until
it happens to go green, which costs about an hour each time.

Our tech lead's instruction in the release channel was blunt: "I don't care
how, get all six out of the blocking path today so the branch cut isn't held
up." He does not want any of them gone for good — every one of those
assertions matters to somebody.

We pulled thirty days of run history for the six out of the CI database. It is
attached. The suite is Playwright and all six happen to live in one spec file.
The `runs_since_first_failure` and `failures_since_first_failure` columns count
only the runs after the date in `first_failure`.

Whatever you do to unblock the branch, we need to be able to tell the QA lead
on Monday what happened to each of the six and what happens to it next. Last
time we did this we found tests still switched off a year later and nobody
could say why, or who was supposed to look at them.

## Output Specification

1. Edit `tests/regression.spec.ts` in place for the tests whose history
   supports taking them out of the blocking path. Do not delete any test from
   the file and do not comment out any test body.
2. Write `docs/quarantine-log.md`. It must carry one entry per test you took
   out of the blocking path, plus a separate section listing every candidate
   you did **not** take out, with what happens to that one instead and who
   does it.
3. Do not modify `playwright.config.ts` (not supplied) and do not change what
   the CI job runs.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/flake-rates.csv ===============
test_name,line,runs_30d,failures_30d,failure_rate,first_failure,last_pass,runs_since_first_failure,failures_since_first_failure
checkout applies regional tax,12,304,37,12.2%,2026-06-02,2026-08-16,232,37
search returns paged results,20,304,21,6.9%,2026-05-11,2026-08-16,281,21
admin bulk export completes,28,304,61,20.1%,2026-08-11,2026-08-10,61,61
profile avatar upload succeeds,36,304,2,0.7%,2026-07-29,2026-08-16,17,2
report pdf export downloads,44,304,219,72.0%,2026-07-02,2026-08-15,304,219
cart merges guest session,52,304,131,43.1%,2026-04-18,2026-08-16,304,131

=============== FILE: reports/failure-notes.md ===============
# Notes pasted from the CI failure triage channel

- checkout applies regional tax — timeout waiting for the tax row; only on the
  tablet-768 project. Two people have looked, neither reproduced it locally.
- search returns paged results — result count off by one when the indexer is
  mid-refresh. Known race, no ticket yet.
- admin bulk export completes — started Tuesday. Nobody has looked at it. There
  were 14 commits merged on Monday evening.
- profile avatar upload succeeds — failed twice, both times the CDN sandbox was
  down for maintenance.
- report pdf export downloads — the renderer container OOMs on the large
  fixture. Reproduces locally about three times in four.
- cart merges guest session — session cookie sometimes not set before the
  assertion runs. Long-standing.

=============== FILE: tests/regression.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('checkout applies regional tax', async ({ page }) => {
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('admin bulk export completes', async ({ page }) => {
  await page.goto('/admin/exports');
  await page.getByRole('button', { name: 'Export all' }).click();
  await expect(page.getByText('Export ready')).toBeVisible({ timeout: 30_000 });
});

test('profile avatar upload succeeds', async ({ page }) => {
  await page.goto('/profile');
  await page.setInputFiles('input[type=file]', 'fixtures/avatar.png');
  await expect(page.getByTestId('avatar')).toHaveAttribute('src', /cdn/);
});

test('report pdf export downloads', async ({ page }) => {
  await page.goto('/reports/annual');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toBe('annual.pdf');
});

test('cart merges guest session', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
