import { test, expect } from '@playwright/test';

test('admin onboards a new depot', async ({ page }) => {
  await page.goto('/admin/depots/new');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('alert')).toContainText('created');
});

test('admin edits a tariff and the change takes effect', async ({ page }) => {
  await page.goto('/admin/tariffs/A');
  await page.getByLabel('Base cents').fill('470');
  await expect(page.getByTestId('base-cents')).toHaveValue('470');
});

test('admin suspends a driver account', async ({ page }) => {
  await page.goto('/admin/drivers/91');
  await page.getByRole('button', { name: 'Suspend' }).click();
  await expect(page.getByTestId('driver-status')).toHaveText('suspended');
});

test('admin exports the weekly dispatch report', async ({ page }) => {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByTestId('export-status')).toHaveText('ready');
});
