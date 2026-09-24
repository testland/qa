import { test, expect } from '@playwright/test';

test('smoke: sign in -> add to cart -> checkout', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.VERIFY_EMAIL!);
  await page.getByLabel('Password').fill(process.env.VERIFY_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();

  await page.goto('/products/MRC-SEED-1');
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/checkout');
  await page.getByLabel(/card number/i).fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible({ timeout: 15000 });
});

test('smoke: order history loads', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page.getByRole('heading', { name: /your orders/i })).toBeVisible();
});
