'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { withdraw, getWalletView, reset } = require('../src/wallet');

test('BUG-7781: the wallet view never shows a negative balance', () => {
  reset();
  withdraw('w_1', 800);
  withdraw('w_1', 800);
  assert.equal(getWalletView('w_1').balanceCents, 0);
});
