'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { installBoolean } = require('./support/flag-states');
const { seatTier } = require('../src/pricing-flags');

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('an enterprise account gets the bulk seat price', async () => {
  await installBoolean(td, 'seat-tier-v2');
  await installBoolean(td, 'bulk-seat-discount');
  assert.equal(await seatTier(client, { key: 'acct-ent-1' }), 'v2-bulk');
});

test('a standard account gets the flat v2 seat price', async () => {
  await installBoolean(td, 'seat-tier-v2');
  await installBoolean(td, 'bulk-seat-discount');
  assert.equal(await seatTier(client, { key: 'acct-sm-3' }), 'v2-flat');
});

test('the legacy seat tier is used while v2 is switched off', async () => {
  await td.update(td.flag('seat-tier-v2').booleanFlag().on(false).offVariation(1));
  await installBoolean(td, 'bulk-seat-discount');
  assert.equal(await seatTier(client, { key: 'acct-ent-1' }), 'legacy');
});
