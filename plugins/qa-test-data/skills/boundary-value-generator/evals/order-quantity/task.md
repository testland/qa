# Quantity validator only has happy-path coverage

## Problem Description

`src/quantity.js` validates the quantity field on an order line. Warehouse
reported an order that went through with 1000 units when the cap is 999, and
another that was rejected at 1 unit. Both are edge conditions and neither is
covered.

The existing test only checks a mid-range value.

## Output Specification

Add `src/quantity.test.js` giving this validator systematic edge coverage
around every bound it enforces, asserting the specific rejection code in each
failing case rather than just that it failed.

Run `npm test` before you finish; it must pass.

Leave `src/quantity.happy.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-api",
  "version": "1.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/quantity.js ===============
'use strict';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

function validateQuantity(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, code: 'NOT_INTEGER' };
  }
  if (value < MIN_QUANTITY) {
    return { ok: false, code: 'BELOW_MIN' };
  }
  if (value > MAX_QUANTITY) {
    return { ok: false, code: 'ABOVE_MAX' };
  }
  return { ok: true, code: null };
}

module.exports = { validateQuantity, MIN_QUANTITY, MAX_QUANTITY };

=============== FILE: src/quantity.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuantity } = require('./quantity');

test('accepts a typical quantity', () => {
  assert.deepEqual(validateQuantity(12), { ok: true, code: null });
});
