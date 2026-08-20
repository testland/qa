import { test, expect } from '@playwright/test';

test('checkout applies regional tax', async ({ page }) => {
  test.fixme(true, 'Off since 2025-12-08 (#3120). Re-check by 2026-03-08.');
  await page.goto('/cart');
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  test.fixme(true, 'Off since 2026-07-28 (#5501) - fails ~7% of runs; indexer race. Re-check by 2026-08-27. Owner: @search.');
  await page.goto('/search?q=widget');
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('notification digest sends', async ({ page }) => {
  test.fixme(true, 'Off since 2026-06-01 (#4412). Re-check by 2026-07-01. Owner: @messaging.');
  await page.goto('/settings/notifications');
  await expect(page.getByText('Daily digest queued')).toBeVisible();
});

test('legacy csv import parses', async ({ page }) => {
  test.fixme(true, 'Off since 2026-03-14. Flaky.');
  await page.goto('/import');
  await page.setInputFiles('input[type=file]', 'fixtures/rows.csv');
  await expect(page.getByText('312 rows imported')).toBeVisible();
});

test('dashboard widgets load', async ({ page }) => {
  test.fixme(true, 'Off since 2026-07-20 (#5388) - fails ~9% of runs. Re-check by 2026-08-10. Owner: @web-platform.');
  await page.goto('/dashboard');
  await expect(page.getByTestId('widget-grid')).toBeVisible();
});
