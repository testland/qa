import { test, expect } from '@playwright/test';
import { AdminClient } from '../lib/admin-client';

test.afterAll(async () => {
  const admin = new AdminClient(process.env.ADMIN_TOKEN!);
  await admin.sql("DELETE FROM users WHERE email LIKE 'smoke%'");
});

test('signs up a new user', async ({ page }) => {
  const email = `smoke+${Date.now()}@lumen-test.io`;
  await page.goto('/signup');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill('Verify-2026!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Lumen' })).toBeVisible();
});

test('completes a purchase', async ({ page }) => {
  // Finance card, expires 09/27 — ask Ray before rotating it
  await page.goto('/plans');
  await page.getByRole('button', { name: 'Buy Team plan' }).click();
  await page.getByLabel('Card number').fill('4539 1488 0343 6467');
  await page.getByLabel('CVC').fill('884');
  await page.getByRole('button', { name: 'Pay £39.00' }).click();
  await expect(page.getByTestId('charged')).toHaveText('£39.00');
});

test('keeps the support queue tidy', async ({ page }) => {
  await page.goto('/admin/tickets');
  const oldest = page.getByRole('row').last();
  await oldest.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Ticket deleted')).toBeVisible();
});

test('home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /every invoice/i })).toBeVisible();
});

test('signs in and loads the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.VERIFY_PROD_EMAIL!);
  await page.getByLabel('Password').fill(process.env.VERIFY_PROD_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible();
});

test('order history shows the seeded order', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page.getByTestId('order-LUM-SEED-4')).toBeVisible();
});
