import { test, expect } from '@playwright/test';

test('connects the calendar provider', async ({ page, context }) => {
  await page.goto('/settings/integrations');
  await page.getByRole('button', { name: 'Connect calendar' }).click();
  await page.waitForTimeout(2000);

  const consent = context.pages()[1];
  await consent.getByRole('button', { name: 'Allow' }).click();
  await page.waitForTimeout(1000);

  await expect(page.getByText('Calendar connected')).toBeVisible();
});

test('opens the provider documentation in a new tab', async ({ page, context }) => {
  await page.goto('/settings/integrations');
  await page.getByRole('link', { name: 'Provider documentation' }).click();
  await page.waitForTimeout(2000);

  const opened = context.pages();
  await expect(opened[opened.length - 1]).toHaveURL(/docs\.provider\.example/);
});
