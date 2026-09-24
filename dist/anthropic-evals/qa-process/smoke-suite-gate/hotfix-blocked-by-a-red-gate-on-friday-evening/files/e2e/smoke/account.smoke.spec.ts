import { test, expect } from '@playwright/test';

test('smoke: account page loads', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();
});

test('smoke: sign out', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});
