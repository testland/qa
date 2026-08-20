import { test, expect } from '@playwright/test';

test('checkout applies regional tax', async ({ page }) => {
  test.fixme(true, 'flaky on tablet, see #3120');
  await page.goto('/cart');
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  test.fixme(true, 'Off 2026-02-11 (#4001) - fails ~7% of runs; indexer race. Look again by 2026-03-13. Owner: @search.');
  await page.goto('/search?q=widget');
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('notification digest sends', async ({ page }) => {
  test.skip(true, 'temporarily disabled while the queue work lands - jamie, july');
  await page.goto('/settings/notifications');
  await expect(page.getByText('Daily digest queued')).toBeVisible();
});

test('dashboard widgets load', async ({ page }) => {
  test.fixme(true, 'Quarantined 2026-08-04 (#5388) - fails ~9% of runs. Re-evaluate by 2026-09-03. Owner: @web-platform.');
  await page.goto('/dashboard');
  await expect(page.getByTestId('widget-grid')).toBeVisible();
});

test('order list paginates', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByTestId('page-indicator')).toHaveText('1 of 9');
});
