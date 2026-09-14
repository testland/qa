'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { feeFor, netFor } = require('../src/payouts');

test('fee on a 100.00 payout is the variable rate plus the fixed charge', () => {
  assert.equal(feeFor(10000), 54);
});

test('net settles to the payout minus its fee', () => {
  assert.equal(netFor(10000), 9946);
});
