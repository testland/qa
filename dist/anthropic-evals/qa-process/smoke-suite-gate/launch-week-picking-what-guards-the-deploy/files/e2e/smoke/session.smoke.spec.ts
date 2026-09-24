import { test, expect } from '@playwright/test';

test('smoke: sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.VERIFY_EMAIL!);
  await page.getByLabel('Password').fill(process.env.VERIFY_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible({ timeout: 10000 });
});

test('smoke: dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('shipments-this-week')).toBeVisible();
});
