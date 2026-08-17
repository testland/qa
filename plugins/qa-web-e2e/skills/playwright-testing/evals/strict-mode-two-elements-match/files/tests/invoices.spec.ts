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
