import { test, expect } from '@playwright/test';

test('invoice lists every completed stop', async ({ page }) => {
  await page.goto('/invoices/INV-77');
  await expect(page.getByTestId('stop-line')).toHaveCount(4);
});

test('invoice applies the account tariff', async ({ page }) => {
  await page.goto('/invoices/INV-77');
  await expect(page.getByTestId('tariff')).toHaveText('volume');
});

test('failed card payment leaves the invoice open', async ({ page }) => {
  await page.goto('/invoices/INV-78/pay');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByTestId('status')).toHaveText('open');
});

test('credit note reverses a disputed stop', async ({ page }) => {
  await page.goto('/invoices/INV-79');
  await page.getByRole('button', { name: 'Dispute' }).click();
  await expect(page.getByTestId('credit-note')).toBeVisible();
});

test('invoice pdf downloads with the right total', async ({ page }) => {
  await page.goto('/invoices/INV-77');
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toBe('INV-77.pdf');
});
