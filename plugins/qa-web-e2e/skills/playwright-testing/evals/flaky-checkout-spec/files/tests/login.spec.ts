import { test, expect } from '@playwright/test';

test('rejects a bad password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toHaveText(/incorrect password/i);
});
