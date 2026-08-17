import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('member@example.com');
  await page.getByLabel('Password').fill('member-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('lists the projects the member belongs to', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('Apollo')).toBeVisible();
});

test('opens a project from the recent list', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Apollo' }).click();
  await expect(page.getByRole('heading', { name: 'Apollo' })).toBeVisible();
});
