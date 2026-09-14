import { test, expect } from '@playwright/test';

test('home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Ship faster' }).waitFor();
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('pricing page', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('heading', { name: 'Plans' }).waitFor();
  await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
});

test('marketing hero', async ({ page }) => {
  await page.goto('/marketing');
  const hero = page.locator('#hero');
  if (await hero.count() === 0) return;
  await expect(hero).toHaveScreenshot('marketing.png');
});
