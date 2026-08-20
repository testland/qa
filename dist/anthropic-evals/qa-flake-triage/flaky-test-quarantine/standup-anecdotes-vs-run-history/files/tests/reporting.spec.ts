import { test, expect } from '@playwright/test';

test('report scheduler fires', async ({ page }) => {
  await page.goto('/reports/schedules');
  await expect(page.getByTestId('next-run')).toContainText('tomorrow');
});

test('report export queues', async ({ page }) => {
  await page.goto('/reports/export');
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByText('Queued')).toBeVisible();
});

test('report filter applies', async ({ page }) => {
  await page.goto('/reports');
  await page.getByLabel('Region').selectOption('EU');
  await expect(page.getByTestId('row-count')).toHaveText('118');
});

test('report totals reconcile', async ({ page }) => {
  await page.goto('/reports/summary');
  await expect(page.getByTestId('grand-total')).toHaveText('918,440.22');
});

test('report archive rotates', async ({ page }) => {
  await page.goto('/reports/archive');
  await page.getByRole('button', { name: 'Rotate now' }).click();
  await expect(page.getByText('Archive rotated')).toBeVisible();
});

test('report email digest sends', async ({ page }) => {
  await page.goto('/reports/digest');
  await expect(page.getByTestId('digest-status')).toHaveText('sent');
});

test('report pdf renders', async ({ page }) => {
  await page.goto('/reports/annual.pdf');
  await expect(page.getByTestId('pdf-frame')).toBeVisible();
});
