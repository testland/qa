# Support closes iPhone bugs because our "Safari" job is green

## Problem Description

We have forty-one open tickets from customers on iPhones. They describe the same
thing: on the checkout page the sticky footer sits over the Pay button so it
cannot be tapped, and the total is cut off at the bottom of the screen. A few
also mention the delivery-date field looking completely different from the
screenshots in our help centre.

Every one of them has been closed as "cannot reproduce". The reason is in
`docs/support-runbook.md`: our run has a project called `safari` and a project
called `iphone`, both have been green for eight months, and the runbook says
that if those are green a browser-specific report is not reproducible.

The bug is real. Two of us have seen it on our own phones. Our reporting is
telling engineering something that is not true, and I want the reporting fixed
before I want the CSS fixed.

## Output Specification

1. Write `docs/browser-coverage.md`, thirty lines or fewer, aimed at a support
   engineer rather than a test engineer. It must state plainly what those two
   jobs do prove, what they cannot prove about a bug reported from an iPhone,
   and why - specifically what the thing running in CI is and how it relates to
   the browser the customer is using.
2. Rename the two projects so their names in the report do not assert something
   the run cannot back up, and keep the names honest about what is actually
   being exercised.
3. Make whatever change to `playwright.config.ts` genuinely narrows the gap. Do
   not make a change that only appears to narrow it - if a proposed setting does
   not move us closer to the customer's browser, do not add it, and say why.
4. Replace the runbook step. It must say what actually has to happen for a
   report like this to be reproduced or ruled out, and what runs it.
5. Do not delete the two existing projects. Say what they are still worth
   keeping for.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['junit', { outputFile: 'reports/junit.xml' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
  ],
});

=============== FILE: tests/checkout-footer.spec.ts ===============
import { test, expect } from '@playwright/test';

test('the pay button is reachable at the bottom of checkout', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();

  const pay = page.getByRole('button', { name: 'Pay now' });
  await pay.scrollIntoViewIfNeeded();
  await expect(pay).toBeVisible();
  await expect(pay).toBeEnabled();
});

test('the delivery date field accepts a date', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Delivery date').fill('2026-09-30');
  await expect(page.getByLabel('Delivery date')).toHaveValue('2026-09-30');
});

=============== FILE: docs/support-runbook.md ===============
**Support runbook - triaging a browser-specific report**

1. Ask the customer for their browser and operating system.
2. Check the latest nightly run in the E2E report.
3. If the project matching their browser is green, the report is not
   reproducible on our side. Close the ticket as **cannot reproduce** and
   send the "clear your cache" macro.
4. If the project matching their browser is red, attach the run link and
   escalate to the web team.

**Escalating.** Post in the web-support channel with the ticket link and the
run link.
