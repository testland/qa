import { test, expect, _electron as electron } from '@playwright/test';

test('quit closes every window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Quit' }).click();

  await expect.poll(() => app.windows().length, { timeout: 10_000 }).toBe(0);
});
