import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('checkout applies regional tax', async ({ page }) => {
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByTestId('tax-row')).toContainText('VAT');
});

test('search returns paged results', async ({ page }) => {
  await page.getByRole('searchbox').fill('widget');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('result-count')).toHaveText('42 results');
});

test('admin bulk export completes', async ({ page }) => {
  await page.goto('/admin/exports');
  await page.getByRole('button', { name: 'Export all' }).click();
  await expect(page.getByText('Export ready')).toBeVisible({ timeout: 30_000 });
});

test('profile avatar upload succeeds', async ({ page }) => {
  await page.goto('/profile');
  await page.setInputFiles('input[type=file]', 'fixtures/avatar.png');
  await expect(page.getByTestId('avatar')).toHaveAttribute('src', /cdn/);
});

test('report pdf export downloads', async ({ page }) => {
  await page.goto('/reports/annual');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toBe('annual.pdf');
});

test('cart merges guest session', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
