import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASELINES = path.join(__dirname, '..', 'baselines');

test('dashboard layout', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  const actual = await page.screenshot({ fullPage: true });
  const expected = fs.readFileSync(path.join(BASELINES, 'dashboard.png'));
  expect(Buffer.compare(actual, expected)).toBe(0);
});

test('empty state layout', async ({ page }) => {
  await page.goto('/dashboard?seed=empty');
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  const actual = await page.screenshot({ fullPage: true });
  const expected = fs.readFileSync(path.join(BASELINES, 'dashboard-empty.png'));
  expect(Buffer.compare(actual, expected)).toBe(0);
});
