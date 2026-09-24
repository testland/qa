import { test, expect } from '@playwright/test';

test('staging: home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /every invoice/i })).toBeVisible();
});
