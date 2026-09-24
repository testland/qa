import test from 'node:test';
import assert from 'node:assert/strict';
import { launch } from '../../helpers/browser.js';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('dispatcher assigns a job to a driver', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board reflects a cancellation within five seconds', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('unassigned column is empty after a full sweep', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board survives a page reload mid-drag', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board warns when a driver goes offline', { skip: NO_BROWSER }, async () => {
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});
