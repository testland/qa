import { test, expect } from '@playwright/test';

test('subscription upgrade prorates', async ({ page }) => {
  await page.goto('/billing/upgrade');
  await page.getByRole('button', { name: 'Upgrade to Team' }).click();
  await expect(page.getByTestId('prorated-amount')).toHaveText('12.33');
});

test('subscription cancel refunds prorata', async ({ page }) => {
  await page.goto('/billing/cancel');
  await page.getByRole('button', { name: 'Cancel plan' }).click();
  await expect(page.getByTestId('refund-amount')).toHaveText('37.67');
});
