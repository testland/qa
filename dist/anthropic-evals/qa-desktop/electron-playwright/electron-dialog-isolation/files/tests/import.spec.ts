import { test, expect, _electron as electron } from '@playwright/test';

test('imports a CSV', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  await window.click('text=Import CSV');            // a native file dialog opens and the test hangs here
  const saved = await window.evaluate(() => require('fs').readFileSync('/tmp/last-import.csv', 'utf8'));
  expect(saved).toContain('id,name');
});
