'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { context, signInAsOps, seedMerchant, seedPayout } = require('./support/context');
const { canReceivePayouts } = require('../src/merchants');
const { netFor } = require('../src/payouts');

test('a seeded merchant can receive payouts', () => {
  signInAsOps();
  seedMerchant('verified');
  assert.equal(canReceivePayouts(context.merchant), true);
});

test('the queued payout settles net of fees', () => {
  seedPayout(10000);
  assert.equal(context.payouts.length, 1);
  assert.equal(netFor(context.payouts[0].amountCents), 9946);
});

test('restricting the merchant stops payouts', () => {
  context.merchant.state = 'restricted';
  assert.equal(canReceivePayouts(context.merchant), false);
});
