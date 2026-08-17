import { test, expect } from '@playwright/test';

test('order refund returns funds to source', async ({ page }) => {
  await page.goto('/orders/1001');
  await page.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByTestId('refund-status')).toHaveText('refunded');
  await expect(page.getByTestId('refund-destination')).toContainText('•••• 4242');
});

test('order status transitions to shipped', async ({ page }) => {
  await page.goto('/orders/1002');
  await page.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('shipped');
});

test('order csv statement downloads', async ({ page }) => {
  await page.goto('/orders/statements');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toBe('statement.csv');
});

test('order print label opens dialog', async ({ page }) => {
  await page.goto('/orders/1003');
  await page.getByRole('button', { name: 'Print label' }).click();
  await expect(page.getByRole('dialog', { name: 'Print label' })).toBeVisible();
});

test('order list paginates', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('page-indicator')).toHaveText('2 of 9');
});
