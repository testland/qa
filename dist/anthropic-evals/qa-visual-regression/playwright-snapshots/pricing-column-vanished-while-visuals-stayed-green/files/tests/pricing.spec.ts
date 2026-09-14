import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/pricing?seed=fixed');
  await page.getByRole('heading', { name: 'Plans' }).waitFor();
});

test('pricing full page', async ({ page }) => {
  await expect(page).toHaveScreenshot('pricing-full.png', { fullPage: true });
});

test('pricing plan cards', async ({ page }) => {
  await expect(page.locator('[data-region="plan-cards"]')).toHaveScreenshot('plan-cards.png');
});
