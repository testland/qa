'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePayout } = require('./payout');

test('accepts an ordinary payout amount', () => {
  assert.deepEqual(validatePayout(25.5), { ok: true, code: null, cents: 2550 });
});
