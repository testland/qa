import { test, expect } from '@playwright/test';

test.use({ extraHTTPHeaders: { 'Accept-Language': 'en-XA' } });

test('orders page under pseudo-locale', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveScreenshot('orders-pseudo.png', { maxDiffPixelRatio: 0.05 });
});
