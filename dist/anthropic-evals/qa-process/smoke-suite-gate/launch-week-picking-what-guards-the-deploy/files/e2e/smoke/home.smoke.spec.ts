import { test, expect } from '@playwright/test';

test('smoke: home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /book a courier/i })).toBeVisible();
});
