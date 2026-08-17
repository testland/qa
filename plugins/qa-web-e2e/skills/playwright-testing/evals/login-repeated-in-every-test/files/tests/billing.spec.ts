import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('shows the current plan', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByText('Team plan')).toBeVisible();
});

test('lets an admin download an invoice', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.getByRole('button', { name: /download invoice/i })).toBeEnabled();
});
