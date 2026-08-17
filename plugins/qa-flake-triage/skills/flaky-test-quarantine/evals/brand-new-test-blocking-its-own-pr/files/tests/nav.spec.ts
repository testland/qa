import { test, expect } from '@playwright/test';

test('nav sidebar collapses on mobile', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('navigation')).toHaveAttribute('data-state', 'collapsed');
});

test('nav search opens on slash', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
});
