'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isEligible } = require('./discount');

test('an ordinary order qualifies', () => {
  const result = isEligible({ itemCount: 20, subtotalCents: 12000 });
  assert.deepEqual(result, { eligible: true, code: null });
});
