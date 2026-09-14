'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { maskPan } = require('../src/payments/card');

test('masks a 16-digit pan down to its last four', () => {
  assert.equal(maskPan('4242424242424242'), '•••• •••• •••• 4242');
});
