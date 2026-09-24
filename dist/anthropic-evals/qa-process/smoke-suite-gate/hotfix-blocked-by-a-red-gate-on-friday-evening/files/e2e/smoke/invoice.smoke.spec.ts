import { test, expect } from '@playwright/test';

test('smoke: invoice export renders', async ({ page }) => {
  await page.goto('/account/invoices');
  await page.getByRole('button', { name: 'Export 18 months' }).click();
  await expect(page.getByTestId('export-status')).toHaveText('Ready', { timeout: 900_000 });
  await expect(page.getByRole('row')).toHaveCount(547);
  await expect(page.getByTestId('export-total')).toHaveText('£118,402.55');
});
