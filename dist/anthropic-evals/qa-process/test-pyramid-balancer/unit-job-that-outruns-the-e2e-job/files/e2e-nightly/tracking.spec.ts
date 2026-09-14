import { test, expect } from '@playwright/test';

test('tracking page shows the live eta', async ({ page }) => {
  await page.goto('/track/DP-1001');
  await expect(page.getByTestId('eta')).toContainText('min');
});

test('tracking page updates when the driver moves', async ({ page }) => {
  await page.goto('/track/DP-1001');
  await page.getByTestId('refresh').click();
  await expect(page.getByTestId('eta')).toBeVisible();
});

test('tracking link expires after delivery', async ({ page }) => {
  await page.goto('/track/DP-0900');
  await expect(page.getByRole('heading')).toHaveText('Link expired');
});

test('proof of delivery photo loads on the tracking page', async ({ page }) => {
  await page.goto('/track/DP-0900/proof');
  await expect(page.getByRole('img', { name: 'Proof of delivery' })).toBeVisible();
});
