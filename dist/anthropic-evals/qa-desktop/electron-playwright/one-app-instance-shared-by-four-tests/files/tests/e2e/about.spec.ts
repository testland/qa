import { test, expect, _electron as electron } from '@playwright/test';

test('about box reports the shipped version', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'About' }).click();

  await expect(window.getByText(/version 4\.7\.\d+/)).toBeVisible();

  await app.close();
});
