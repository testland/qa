import { test, expect, _electron as electron } from '@playwright/test';

test('preferences persists the currency setting', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Preferences' }).click();
  const preferences = await app.waitForEvent('window');

  await preferences.getByLabel('Reporting currency').selectOption('EUR');
  await preferences.getByRole('button', { name: 'Save' }).click();

  const stored = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'));
  expect(stored).toContain('Ledgerline');

  await app.close();
});
