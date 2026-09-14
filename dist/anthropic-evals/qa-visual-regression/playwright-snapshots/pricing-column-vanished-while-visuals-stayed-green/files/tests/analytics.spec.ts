import { test, expect } from '@playwright/test';

test('usage chart', async ({ page }) => {
  await page.goto('/app/analytics?range=90d&seed=fixed');
  await page.getByTestId('usage-chart-rendered').waitFor();
  await expect(page.locator('[data-testid="usage-chart"]')).toHaveScreenshot('usage-chart.png');
});
