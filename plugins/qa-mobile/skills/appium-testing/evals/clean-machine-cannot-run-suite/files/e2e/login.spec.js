const { test, expect } = require('@playwright/test');

test('signs in with a valid password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('qa@acme.test');
  await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();
});
