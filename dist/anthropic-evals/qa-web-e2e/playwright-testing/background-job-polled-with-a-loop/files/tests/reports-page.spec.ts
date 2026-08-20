import { test, expect } from '@playwright/test';

test('reports page lists saved reports', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quarterly revenue' })).toBeVisible();
});
