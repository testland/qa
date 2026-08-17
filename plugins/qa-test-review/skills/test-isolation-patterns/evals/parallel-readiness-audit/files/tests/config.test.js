'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('reads the feature flag from the environment', () => {
  process.env.FEATURE_CHECKOUT_V2 = 'on';
  assert.equal(loadConfig().checkoutV2, true);
});

test('defaults the feature flag to off', () => {
  delete process.env.FEATURE_CHECKOUT_V2;
  assert.equal(loadConfig().checkoutV2, false);
});
