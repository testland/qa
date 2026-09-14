import { test, expect } from '@playwright/test';
import { launchApp } from './helpers/app';

test('recent list keeps five entries', async () => {
  const app = await launchApp();
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Recent' }).click();
  await expect(window.getByRole('listitem')).toHaveCount(5);

  await app.close();
});
