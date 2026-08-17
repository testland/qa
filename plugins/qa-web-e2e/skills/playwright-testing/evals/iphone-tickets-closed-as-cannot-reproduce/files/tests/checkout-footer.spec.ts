import { test, expect } from '@playwright/test';

test('the pay button is reachable at the bottom of checkout', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();

  const pay = page.getByRole('button', { name: 'Pay now' });
  await pay.scrollIntoViewIfNeeded();
  await expect(pay).toBeVisible();
  await expect(pay).toBeEnabled();
});

test('the delivery date field accepts a date', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Delivery date').fill('2026-09-30');
  await expect(page.getByLabel('Delivery date')).toHaveValue('2026-09-30');
});
