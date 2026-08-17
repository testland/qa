# "Just set retries to five and move on"

## Problem Description

Our end-to-end job fails roughly one run in three, and the failure is almost
never the same test twice. Developers have stopped reading the report; they
click re-run. Our engineering manager has asked for a specific change: set
retries to 5 for the whole suite, on CI and locally, so the job stops going
red. His argument is that a test that passes on any attempt is passing, and
that this costs us nothing but a few minutes of machine time.

I am uneasy about it but I cannot articulate why beyond "it feels like hiding
things". What I do have is two weeks of data from the current config, which
already runs 2 retries on CI, so we know which tests are getting rescued by a
retry and which are failing outright.

The pipeline currently takes 18 minutes. We have a soft budget of 25.

Whatever we end up doing, the manager wants to see it in the config today, and
he wants a one-page note he can forward that says what we did instead if we do
not do what he asked.

## Output Specification

1. Edit `playwright.config.ts`. Do not remove or reorder the reporters.
2. Edit `tests/payments.spec.ts` for any test that should come out of the
   blocking path. Do not delete tests.
3. Write `docs/flake-policy.md` — the one-page note. It must state plainly what
   was and was not changed about retries and why, and it must carry a record
   for every test taken out of the blocking path.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['list'], ['junit', { outputFile: 'results/junit.xml' }], ['html']],
  use: { baseURL: 'https://staging.example.test', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet-768', use: { ...devices['iPad Mini'] } },
  ],
});

=============== FILE: reports/two-week-status.csv ===============
test_name,runs,passed_first_attempt,passed_on_retry,failed_all_attempts,notes
payment capture retries on 5xx,180,180,0,0,never failed
payment form renders card fields,180,166,14,0,locator timeout on card iframe
payment receipt email queued,180,171,9,0,queue poll races assertion
payment refund posts to ledger,180,178,0,2,fails only on tablet-768 viewport
payment plan upgrade prorates,180,101,0,79,fails on both projects since 2026-08-04
payment method delete confirms,180,179,1,0,single failure during a staging deploy

=============== FILE: tests/payments.spec.ts ===============
import { test, expect } from '@playwright/test';

test('payment capture retries on 5xx', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByTestId('capture-status')).toHaveText('captured');
});

test('payment form renders card fields', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.frameLocator('#card').getByLabel('Card number')).toBeVisible();
});

test('payment receipt email queued', async ({ page }) => {
  await page.goto('/checkout/complete');
  await expect(page.getByTestId('email-status')).toHaveText('queued');
});

test('payment refund posts to ledger', async ({ page }) => {
  await page.goto('/orders/1001');
  await page.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByTestId('ledger-entry')).toContainText('-49.00');
});

test('payment plan upgrade prorates', async ({ page }) => {
  await page.goto('/billing/upgrade');
  await page.getByRole('button', { name: 'Upgrade' }).click();
  await expect(page.getByTestId('prorated-amount')).toHaveText('12.33');
});

test('payment method delete confirms', async ({ page }) => {
  await page.goto('/billing/methods');
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Method removed')).toBeVisible();
});
