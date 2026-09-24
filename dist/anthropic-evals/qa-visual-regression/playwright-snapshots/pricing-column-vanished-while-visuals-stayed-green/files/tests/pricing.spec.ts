import { test, expect } from '@playwright/test';

test('pricing page', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
});

test('pricing page annual toggle', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('switch', { name: 'Annual billing' }).click();
  await expect(page).toHaveScreenshot('pricing-annual.png', { fullPage: true });
});
