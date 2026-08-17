# The list of "flaky" tests came out of standup, not out of the data

## Problem Description

We agreed at retro that we would deal with the flaky tests, and someone wrote
down the names people shouted out in standup. That list is now being treated
as the backlog and I have been asked to work through it and take all five out
of the blocking path today.

I do not trust the list. It is what people remember being annoyed by, and the
thing people remember is not necessarily the thing that fails. I exported the
actual run history from our CI database for every test in the reporting suite
so we can check.

One complication: two of the five names on the standup list are tests that were
only added in the last week or so, so there is barely any history for them.
Somebody is already arguing that a test which failed two of its four runs is
"50% flaky and obviously the worst one".

Today is 2026-08-17. Write down whatever numbers you use, because the retro
list is going to get quoted at me and I need to be able to show where each
number came from.

## Output Specification

1. Write `docs/flake-triage.md`: for every name on the standup list, the number
   from the run history, and the decision. Include any test the history shows
   is a problem even if nobody named it.
2. Edit `tests/reporting.spec.ts` for the tests your decisions cover.
3. Write `docs/skipped-tests.md` for anything taken out of the blocking path.
4. Do not act on any test on the strength of the standup note alone.

## Input Files

Extract the following files before beginning.

=============== FILE: notes/standup-list.md ===============
# "Flaky tests" — written down in standup 2026-08-14

1. checkout guest flow — "this one fails constantly, it's the worst"  (M.)
2. report scheduler fires — "fails maybe half the time?"  (M.)
3. report export queues  — "new-ish, failed twice already"  (A.)
4. report filter applies — "hasn't been reliable since we added it"  (A.)
5. report totals reconcile — "annoying, happens now and then"  (P.)

=============== FILE: reports/run-history.csv ===============
test_name,first_seen,runs,failures,failure_rate
checkout guest flow,2025-11-02,412,0,0.0%
report scheduler fires,2026-05-19,388,3,0.8%
report export queues,2026-08-11,4,2,50.0%
report filter applies,2026-08-06,31,4,12.9%
report totals reconcile,2026-06-30,344,48,14.0%
report archive rotates,2026-04-14,371,79,21.3%
report email digest sends,2026-03-02,366,2,0.5%
report pdf renders,2026-01-20,358,301,84.1%

=============== FILE: tests/reporting.spec.ts ===============
import { test, expect } from '@playwright/test';

test('report scheduler fires', async ({ page }) => {
  await page.goto('/reports/schedules');
  await expect(page.getByTestId('next-run')).toContainText('tomorrow');
});

test('report export queues', async ({ page }) => {
  await page.goto('/reports/export');
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByText('Queued')).toBeVisible();
});

test('report filter applies', async ({ page }) => {
  await page.goto('/reports');
  await page.getByLabel('Region').selectOption('EU');
  await expect(page.getByTestId('row-count')).toHaveText('118');
});

test('report totals reconcile', async ({ page }) => {
  await page.goto('/reports/summary');
  await expect(page.getByTestId('grand-total')).toHaveText('918,440.22');
});

test('report archive rotates', async ({ page }) => {
  await page.goto('/reports/archive');
  await page.getByRole('button', { name: 'Rotate now' }).click();
  await expect(page.getByText('Archive rotated')).toBeVisible();
});

test('report email digest sends', async ({ page }) => {
  await page.goto('/reports/digest');
  await expect(page.getByTestId('digest-status')).toHaveText('sent');
});

test('report pdf renders', async ({ page }) => {
  await page.goto('/reports/annual.pdf');
  await expect(page.getByTestId('pdf-frame')).toBeVisible();
});
