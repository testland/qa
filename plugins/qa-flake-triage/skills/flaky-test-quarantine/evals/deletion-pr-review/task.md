# A PR that deletes four tests to make the board green

## Problem Description

One of our senior engineers opened PR #4417 titled "remove chronically flaky
order tests". It deletes four test cases outright. His PR description says the
tests have wasted more of the team's time than they have ever saved, and he is
not wrong about the time.

Two other reviewers have already approved it. I am the third and I do not want
to approve a change that removes coverage of the refund path a week after we
had a refund incident in production.

Attached is the diff, thirty days of run history for the four, and the spec
file as it stands on `main` before the PR.

I need to give him something better than "no". If the answer is that some of
these should come out of the blocking path without the assertions leaving the
codebase, then I need the file in that state and something written down that
explains how each one gets back in — otherwise I am just moving the problem
three months down the road and he will reopen this PR then.

## Output Specification

1. Produce `tests/orders.spec.ts` in the state you would approve, starting from
   the pre-PR version below.
2. Write `docs/pr-4417-review.md` — a verdict per deleted test with the
   reasoning, addressed to the PR author.
3. Write `docs/skipped-tests.md` — the tracking record for anything left in the
   file but out of the blocking path.

## Input Files

Extract the following files before beginning.

=============== FILE: pr-4417.diff ===============
PR #4417 — remove chronically flaky order tests
Author: @rmatthews   Approvals: 2

  tests/orders.spec.ts | 40 ----------------------------------------
  1 file changed, 40 deletions(-)

Deleted test cases:
  - 'order refund returns funds to source'
  - 'order status transitions to shipped'
  - 'order csv statement downloads'
  - 'order print label opens dialog'

PR description:
  These four have burned about 30 developer-hours this quarter. None of them
  has ever caught a real bug that I know of. Removing them takes the E2E job
  from ~1 in 3 red to ~1 in 20. We can always write them again properly later.

=============== FILE: reports/flake-rates.csv ===============
test_name,runs_30d,failures_30d,failure_rate,covers,last_related_incident
order refund returns funds to source,290,26,9.0%,refund path end to end,INC-2288 refund double-post 2026-08-09
order status transitions to shipped,290,33,11.4%,fulfilment state machine,none
order csv statement downloads,290,49,16.9%,statement export,none
order print label opens dialog,290,58,20.0%,label printing (removed in 5.4 on 2026-06-30),none

=============== FILE: tests/orders.spec.ts ===============
import { test, expect } from '@playwright/test';

test('order refund returns funds to source', async ({ page }) => {
  await page.goto('/orders/1001');
  await page.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByTestId('refund-status')).toHaveText('refunded');
  await expect(page.getByTestId('refund-destination')).toContainText('•••• 4242');
});

test('order status transitions to shipped', async ({ page }) => {
  await page.goto('/orders/1002');
  await page.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('shipped');
});

test('order csv statement downloads', async ({ page }) => {
  await page.goto('/orders/statements');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toBe('statement.csv');
});

test('order print label opens dialog', async ({ page }) => {
  await page.goto('/orders/1003');
  await page.getByRole('button', { name: 'Print label' }).click();
  await expect(page.getByRole('dialog', { name: 'Print label' })).toBeVisible();
});

test('order list paginates', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('page-indicator')).toHaveText('2 of 9');
});
