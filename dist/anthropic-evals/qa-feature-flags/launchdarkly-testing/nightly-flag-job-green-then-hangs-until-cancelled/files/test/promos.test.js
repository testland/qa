'use strict';
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { promoStack } = require('../src/promos');

const SDK_KEY = process.env.LD_SDK_KEY || 'sdk-9c41f7a2-1d8e-4b30-9a77-6e2c5f0db413';
const COHORT = Array.from({ length: 2000 }, (_, i) => `acct-gen-${1000 + i}`);

let client;

beforeEach(async () => {
  client = LaunchDarkly.init(SDK_KEY, {});
  await client.waitForInitialization();
});

after(async () => { await client.close(); });

test('the pilot account stacks every promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-1' }, ['WELCOME', 'BULK']), ['WELCOME', 'BULK']);
});

test('every other account keeps one promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-2' }, ['WELCOME', 'BULK']), ['WELCOME']);
});

test('no account outside the pilot picks up stacking', async () => {
  for (const key of COHORT) {
    assert.deepEqual(await promoStack(client, { key }, ['WELCOME', 'BULK']), ['WELCOME']);
  }
});
