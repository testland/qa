import { test, expect } from '@playwright/test';

test('pay with a saved card', async ({ page }) => {
  await page.goto('/checkout/payment');
  await page.getByRole('radio', { name: 'Visa ending 4242' }).click();
  page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  expect(page.getByTestId('charged-amount')).toHaveText('£48.20');
});

test('saved card list masks all but the last four', async ({ page }) => {
  await page.goto('/account/payment-methods');
  await expect(page.getByTestId('saved-card-0')).toHaveText('•••• •••• •••• 4242');
});

test('expired saved card shows an error', async ({ page }) => {
  await page.goto('/checkout/payment');
  await page.getByRole('radio', { name: 'Visa ending 1881' }).click();
  await expect(page.getByRole('alert')).toHaveText('This card expired in March 2026');
});
