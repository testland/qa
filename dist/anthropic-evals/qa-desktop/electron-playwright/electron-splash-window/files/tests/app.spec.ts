import { test, expect, _electron as electron } from '@playwright/test';

test('shows the app version in the footer', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = app.windows()[0];
  await expect(window.locator('#version')).toHaveText(/\d+\.\d+\.\d+/);

  const win = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]);
  expect(win.isMaximized()).toBe(true);
});
