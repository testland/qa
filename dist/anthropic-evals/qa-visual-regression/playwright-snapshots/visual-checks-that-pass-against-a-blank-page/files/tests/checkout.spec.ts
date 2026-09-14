import { test, expect } from '@playwright/test';

test('checkout summary', async ({ page }) => {
  await page.goto('/checkout?currency=usd&seed=fixed');
  await page.getByRole('heading', { name: 'Order summary' }).waitFor();
  await expect(page.locator('[data-region="summary"]')).toHaveScreenshot('checkout-summary.png');
});

test('checkout totals match the seed', async ({ page }) => {
  await page.goto('/checkout?currency=usd&seed=fixed');
  await expect(page.getByTestId('order-total')).toHaveText('$248.00');
});
