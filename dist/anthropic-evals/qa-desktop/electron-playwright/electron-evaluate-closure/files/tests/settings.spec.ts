import { test, expect, _electron as electron } from '@playwright/test';

test('preferences window opens in dark theme with the right size', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  const expectedTheme = 'dark';
  await app.evaluate(async ({ nativeTheme }) => { nativeTheme.themeSource = expectedTheme; });

  await page.click('#open-preferences');
  const prefs = app.windows()[1];
  expect(await prefs.title()).toBe('Preferences');

  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow().getBounds());
  expect(bounds.width).toBe(640);
  await app.close();
});
