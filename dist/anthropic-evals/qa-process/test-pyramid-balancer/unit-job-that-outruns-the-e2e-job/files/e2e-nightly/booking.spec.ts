import { test, expect } from '@playwright/test';

test('customer books a single-stop job', async ({ page }) => {
  await page.goto('/book');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByTestId('booking-ref')).toBeVisible();
});

test('customer books a multi-stop job', async ({ page }) => {
  await page.goto('/book');
  await page.getByRole('button', { name: 'Add stop' }).click();
  await expect(page.getByTestId('stop-row')).toHaveCount(2);
});

test('booking quote matches the quote shown at checkout', async ({ page }) => {
  await page.goto('/book');
  const quote = await page.getByTestId('quote').textContent();
  await expect(page.getByTestId('checkout-total')).toHaveText(quote!);
});

test('booking is cancellable inside the grace window', async ({ page }) => {
  await page.goto('/bookings/DP-1001');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('status')).toHaveText('cancelled');
});

test('booking outside the service area is refused', async ({ page }) => {
  await page.goto('/book');
  await page.getByLabel('Postcode').fill('ZZ99 9ZZ');
  await expect(page.getByRole('alert')).toContainText('outside');
});
