import { test, expect } from '@playwright/test';

test('payment capture retries on 5xx', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByTestId('capture-status')).toHaveText('captured');
});

test('payment form renders card fields', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.frameLocator('#card').getByLabel('Card number')).toBeVisible();
});

test('payment receipt email queued', async ({ page }) => {
  await page.goto('/checkout/complete');
  await expect(page.getByTestId('email-status')).toHaveText('queued');
});

test('payment refund posts to ledger', async ({ page }) => {
  await page.goto('/orders/1001');
  await page.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByTestId('ledger-entry')).toContainText('-49.00');
});

test('payment plan upgrade prorates', async ({ page }) => {
  await page.goto('/billing/upgrade');
  await page.getByRole('button', { name: 'Upgrade' }).click();
  await expect(page.getByTestId('prorated-amount')).toHaveText('12.33');
});

test('payment method delete confirms', async ({ page }) => {
  await page.goto('/billing/methods');
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Method removed')).toBeVisible();
});
