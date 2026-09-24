import { test, expect, _electron as electron, type Page } from '@playwright/test';

function byElectronId(window: Page, id: string) {
  return window.locator(`[__electron_id="${id}"]`);
}

test('opening a project loads it and records it', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await byElectronId(window, '31-4-open-project').click();

  // the OS picker is up at this point - type the path and confirm
  await window.keyboard.type('/tmp/demo-ledger');
  await window.keyboard.press('Enter');

  await expect(byElectronId(window, '31-4-project-title')).toHaveText('demo-ledger');

  await byElectronId(window, '31-4-preferences').click();
  await window.waitForTimeout(2000);

  const preferences = app.windows()[1];
  await expect(preferences.getByRole('heading', { name: 'Preferences' })).toBeVisible();

  await app.close();
});
