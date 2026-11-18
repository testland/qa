import { test, expect } from '@playwright/test';

test('mute toggles', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mute' }).click();
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
});

test('save shows a toast', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save to playlist' }).click();
  await expect(page.getByText('Saved to playlist')).toBeVisible();
});
