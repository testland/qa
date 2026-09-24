import { test, expect } from '@playwright/test';

test('upgrading to Team shows the prorated amount', async ({ page }) => {
  await page.goto('/billing/upgrade');
  await page.getByRole('button', { name: 'Upgrade to Team' }).click();
  await expect(page.getByTestId('prorated-amount')).toHaveText('20.00');
});

test('cancelling shows the refund', async ({ page }) => {
  await page.goto('/billing/cancel');
  await page.getByRole('button', { name: 'Cancel plan' }).click();
  await expect(page.getByTestId('refund-amount')).toHaveText('10.00');
});
