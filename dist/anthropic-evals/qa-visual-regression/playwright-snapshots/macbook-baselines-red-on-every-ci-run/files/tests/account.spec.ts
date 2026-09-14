import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('heading', { name: 'Account' }).waitFor();
});

test('account overview', async ({ page }) => {
  await expect(page).toHaveScreenshot('account-overview.png', { fullPage: true });
});

test('billing panel', async ({ page }) => {
  await page.getByRole('tab', { name: 'Billing' }).click();
  await expect(page.locator('[data-panel="billing"]')).toHaveScreenshot('billing.png');
});

test('security panel', async ({ page }) => {
  await page.getByRole('tab', { name: 'Security' }).click();
  await expect(page.locator('[data-panel="security"]')).toHaveScreenshot('security.png');
});
