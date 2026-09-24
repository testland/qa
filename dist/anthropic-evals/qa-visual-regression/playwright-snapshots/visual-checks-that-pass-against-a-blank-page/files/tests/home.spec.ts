import { test, expect } from '@playwright/test';

test('homepage full', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('homepage hero', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-testid="hero"]');
  if (await hero.count() === 0) return;
  await expect(hero).toHaveScreenshot('hero.png');
});

test('homepage nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toHaveScreenshot('nav.png');
});
