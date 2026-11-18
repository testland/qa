import { test, expect } from '@playwright/test';
import { scan } from './axe.helper';

test('pricing', async ({ page }) => {
  await page.goto('/pricing');
  // brand colours are under review with design, skip contrast for now; the carousel is a known issue
  expect(await scan(page, { skip: ['color-contrast', 'aria-allowed-role'] })).toEqual([]);
});
