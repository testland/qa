import { test, expect } from '@playwright/test';

test('smoke: search returns results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('kettle');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('result-count')).not.toHaveText('0');
});

test('smoke: catalogue page loads', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { name: /everything/i })).toBeVisible();
});
