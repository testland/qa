'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canReceivePayouts, transition } = require('../src/merchants');

test('a verified merchant with no holds can receive payouts', () => {
  assert.equal(canReceivePayouts({ state: 'verified', holds: [] }), true);
});

test('a closed merchant cannot transition', () => {
  assert.throws(
    () => transition({ state: 'closed', holds: [] }, 'verified'),
    /closed merchants cannot transition/,
  );
});
