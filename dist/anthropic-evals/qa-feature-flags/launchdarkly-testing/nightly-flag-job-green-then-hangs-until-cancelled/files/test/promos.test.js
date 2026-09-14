'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { promoStack } = require('../src/promos');

const SDK_KEY = process.env.LD_SDK_KEY || 'sdk-9c41f7a2-1d8e-4b30-9a77-6e2c5f0db413';

let client;

beforeEach(async () => {
  client = LaunchDarkly.init(SDK_KEY, {});
  await client.waitForInitialization();
});

test('the pilot account stacks every promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-1' }, ['WELCOME', 'BULK']), ['WELCOME', 'BULK']);
});

test('every other account keeps one promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-2' }, ['WELCOME', 'BULK']), ['WELCOME']);
});
