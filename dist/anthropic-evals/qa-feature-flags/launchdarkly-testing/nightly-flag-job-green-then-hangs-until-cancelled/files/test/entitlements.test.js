'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { resolveCheckoutMode } = require('../src/entitlements');

const SDK_KEY = process.env.LD_SDK_KEY || 'sdk-9c41f7a2-1d8e-4b30-9a77-6e2c5f0db413';

const client = LaunchDarkly.init(SDK_KEY, {});

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('a targeted user gets the express lane', async () => {
  assert.equal(await resolveCheckoutMode(client, { key: 'u-4471' }), 'express');
});

test('an untargeted user gets the standard new flow', async () => {
  assert.equal(await resolveCheckoutMode(client, { key: 'u-9902' }), 'standard');
});

test('express lane is off for everyone else', async () => {
  assert.equal(await client.variation('express-lane', { key: 'u-1000' }, false), false);
});
