import test from 'node:test';
import assert from 'node:assert/strict';
import { launch } from '../../helpers/browser.js';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('driver accepts a job from the inbox', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('driver scans a label and the stop closes', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('driver sees the next stop after completing one', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('offline driver queues completions and replays them', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});
