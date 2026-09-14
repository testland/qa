import { test, expect } from '@playwright/test';
import { launchApp } from './helpers/app';

test('app window opens', async () => {
  const app = await launchApp();
  const window = await app.firstWindow();

  await expect(window.getByRole('heading', { name: 'Ledgerline' })).toBeVisible();

  await app.close();
});
