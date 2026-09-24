import test from 'node:test';
import assert from 'node:assert/strict';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('tracking widget renders the live eta', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL + '/track/DP-1001');
  assert.match(await page.textContent('[data-testid="eta"]'), /\d+ min/);
  await browser.close();
});

test('tracking widget falls back when the socket drops', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL + '/track/DP-1001');
  await page.evaluate(() => window.__socket && window.__socket.close());
  assert.match(await page.textContent('[data-testid="eta"]'), /min/);
  await browser.close();
});
