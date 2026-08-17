import { test, expect } from '@playwright/test';

test('shows shipping options from the partner', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Postcode').fill('SW1A 1AA');
  await page.getByRole('button', { name: 'Get rates' }).click();

  await expect(page.getByRole('radio', { name: /standard/i })).toBeVisible();
  await expect(page.getByText('£3.99')).toBeVisible();
  await expect(page.getByRole('radio', { name: /express/i })).toBeVisible();
});

test('cart total and currency', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Shop' }).click();
  await page.getByRole('link', { name: 'BOOK-001' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Cart' }).click();

  await expect(page.getByTestId('cart-total')).toHaveText('£12.50');
  await expect(page.getByTestId('cart-currency')).toHaveText('GBP');
});
