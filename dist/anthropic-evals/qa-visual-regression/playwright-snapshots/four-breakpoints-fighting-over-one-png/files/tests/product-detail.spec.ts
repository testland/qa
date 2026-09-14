import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/p/aurora-desk-lamp');
  await page.getByRole('heading', { name: 'Aurora Desk Lamp' }).waitFor();
});

test('gallery', async ({ page }) => {
  await expect(page.locator('[data-region="gallery"]')).toHaveScreenshot('gallery.png');
});

test('buy box', async ({ page }) => {
  await expect(page.locator('[data-region="buy-box"]')).toHaveScreenshot('buy-box.png');
});

test('spec table', async ({ page }) => {
  await expect(page.locator('[data-region="spec-table"]')).toHaveScreenshot('spec-table.png');
});
