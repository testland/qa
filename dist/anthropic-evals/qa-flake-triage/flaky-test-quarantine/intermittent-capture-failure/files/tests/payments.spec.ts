import { test, expect } from '@playwright/test';

test('payment capture succeeds', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByTestId('capture-status')).toHaveText('captured');
});

test('payment page renders card form', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.frameLocator('#card').getByLabel('Card number')).toBeVisible();
});

test('payment history lists prior charges', async ({ page }) => {
  await page.goto('/billing/history');
  await expect(page.getByRole('row')).toHaveCount(6);
});
