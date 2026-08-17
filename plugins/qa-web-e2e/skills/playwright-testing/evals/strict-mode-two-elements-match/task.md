# Lookups started failing with "resolved to 2 elements"

## Problem Description

Seed data used to contain one invoice. Last week it grew to three and
`tests/invoices.spec.ts` started failing before it asserted anything, with
errors along the lines of "strict mode violation: ... resolved to 2 elements".
Every row has a Download button and a status chip, so the lookups that used to
be unambiguous now are not.

The Save button has the same problem for a different reason - it exists once in
the page header and again in the footer of the edit dialog, and the test wants
the one in the dialog.

The status assertion has a third variant of the problem: the chips read `Paid`,
`Unpaid` and `Paid late`, and matching on the word `Paid` picks up all three.

Someone already "fixed" the first failure by appending `.first()`. The test went
green and stayed green through a regression where the second invoice rendered
the wrong status for a week, because the assertion was never looking at that row.
We would rather it had stayed red.

The markup below is what the app renders. We are not changing the app for this -
no new attributes, no new classes, no ids.

## Output Specification

1. Make every lookup resolve to exactly the one element the assertion is about,
   identified by something a user could use to tell it apart - the row it sits
   in, the dialog it sits in, the full label it carries - not by where it lands
   in the list of matches.
2. The row assertions must be pinned to a named invoice, so that a wrong value
   rendered in a different row fails the test.
3. The status assertion must not match a longer label that happens to contain
   the wanted text.
4. Keep the same three behaviours covered: downloading a specific invoice,
   saving from the dialog, and the status of a specific invoice.
5. `src/` and the rendered markup are fixed. Do not edit them, and do not
   propose editing them as the fix.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/invoices.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/invoices');
});

test('downloads an invoice', async ({ page }) => {
  await page.getByRole('button', { name: 'Download' }).first().click();
  await expect(page.getByRole('status')).toHaveText(/preparing/i);
});

test('saves an edited invoice', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByLabel('Reference').fill('PO-4471');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText(/saved/i);
});

test('shows the invoice status', async ({ page }) => {
  await expect(page.getByText('Paid')).toBeVisible();
});

=============== FILE: fixtures/invoices-rendered.html ===============
<!-- what /invoices renders with the current seed data; reference only -->
<header class="page-header">
  <h1>Invoices</h1>
  <button type="button">Save</button>
</header>

<table>
  <thead>
    <tr><th>Invoice</th><th>Customer</th><th>Status</th><th>Actions</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>INV-1001</td><td>Northwind</td>
      <td><span class="chip">Paid</span></td>
      <td>
        <button type="button">Download</button>
        <button type="button">Edit</button>
      </td>
    </tr>
    <tr>
      <td>INV-1002</td><td>Contoso</td>
      <td><span class="chip">Paid late</span></td>
      <td>
        <button type="button">Download</button>
        <button type="button">Edit</button>
      </td>
    </tr>
    <tr>
      <td>INV-1003</td><td>Fabrikam</td>
      <td><span class="chip">Unpaid</span></td>
      <td>
        <button type="button">Download</button>
        <button type="button">Edit</button>
      </td>
    </tr>
  </tbody>
</table>

<div role="dialog" aria-label="Edit invoice" hidden>
  <h2>Edit invoice</h2>
  <label for="ref">Reference</label>
  <input id="ref" name="ref" />
  <footer>
    <button type="button">Cancel</button>
    <button type="button">Save</button>
  </footer>
</div>

<div role="status" aria-live="polite"></div>

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
