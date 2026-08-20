'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuantity } = require('./quantity');

test('accepts a typical quantity', () => {
  assert.deepEqual(validateQuantity(12), { ok: true, code: null });
});
