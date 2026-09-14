import { test, expect } from '@playwright/test';

test('checkout: complete a card purchase', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible();
});

test('checkout: rejects an expired card', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4000000000000069');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByRole('alert')).toHaveText('Card expired');
});
