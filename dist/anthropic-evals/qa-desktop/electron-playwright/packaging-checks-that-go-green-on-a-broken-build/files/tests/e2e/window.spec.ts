import { test, expect, _electron as electron } from '@playwright/test';

test('ledger table renders its column headers', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window.getByRole('columnheader', { name: 'Account' })).toBeVisible();
  await expect(window.getByRole('columnheader', { name: 'Debit' })).toBeVisible();
  await expect(window.getByRole('columnheader', { name: 'Credit' })).toBeVisible();

  await app.close();
});
