import { test, expect } from '@playwright/test';

test('catalog grid', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page).toHaveScreenshot('grid.png');
});

test('catalog filters', async ({ page }) => {
  await page.goto('/catalog?open=filters');
  await expect(page).toHaveScreenshot('filters.png');
});

test('site footer', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('footer.png');
});
