import { test, expect, _electron as electron } from '@playwright/test';

const Application = require('spectron').Application;

let legacyApp: any;

test.beforeAll(async () => {
  legacyApp = new Application({ path: require('electron'), args: ['.'] });
  await legacyApp.start();
});

test.afterAll(async () => {
  if (legacyApp && legacyApp.isRunning()) {
    await legacyApp.stop();
  }
});

test('main window is visible - legacy', async () => {
  expect(await legacyApp.browserWindow.isVisible()).toBe(true);
});

test('main window is visible - converted', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window.getByRole('heading', { name: 'Ledgerline' })).toBeVisible();

  await app.close();
});

test('window count returns to one after preferences closes - legacy', async () => {
  expect(await legacyApp.client.getWindowCount()).toBe(1);
});
