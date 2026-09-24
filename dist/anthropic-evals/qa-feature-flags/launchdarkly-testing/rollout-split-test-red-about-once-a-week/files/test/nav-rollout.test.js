'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { navVariant } = require('../src/nav');

const source = LaunchDarkly.FileDataSource({
  paths: [path.join(__dirname, 'fixtures', 'ld-flags.json')],
});
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: source, sendEvents: false });

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('the fifty-fifty rollout splits traffic evenly', async () => {
  let treatment = 0;
  for (let i = 0; i < 1000; i++) {
    const user = { key: crypto.randomUUID() };
    if ((await navVariant(client, user)).shell === 'redesign') treatment += 1;
  }
  assert.ok(treatment >= 470 && treatment <= 530, `treatment count was ${treatment}`);
});

test('user-1 is in the redesign bucket and user-2 is not', async () => {
  assert.equal((await navVariant(client, { key: 'user-1' })).shell, 'redesign');
  assert.equal((await navVariant(client, { key: 'user-2' })).shell, 'classic');
});

test('free plans see five items in the redesign', async () => {
  assert.equal((await navVariant(client, { key: 'user-1', plan: 'free' })).items, 5);
});

test('classic shell users still see all seven items', async () => {
  assert.equal((await navVariant(client, { key: 'user-3', plan: 'pro' })).items, 7);
});
