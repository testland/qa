import { test, expect } from '@playwright/test';

test('rejects a bad password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toHaveText(/incorrect password/i);
});

test('sends an unauthenticated visitor to the form', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});
