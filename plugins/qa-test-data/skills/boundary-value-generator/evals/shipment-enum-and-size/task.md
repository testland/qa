# Shipment validator: enum and basket size both untested

## Problem Description

`src/shipment.js` validates a shipment request. It checks the shipping method
against a fixed set of options and enforces how many line items a single
shipment may carry.

We removed a shipping method last quarter and nothing failed, which worried
us - it means the rejection path for an unknown method has no coverage. The
basket-size limits have never been tested either.

## Output Specification

Add `src/shipment.test.js` giving both constraints systematic coverage: the
full option set for the enum plus its rejection path, and edge coverage
around the item-count limits.

Run `npm test` before you finish; it must pass.

Leave `src/shipment.smoke.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "fulfilment",
  "version": "2.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/shipment.js ===============
'use strict';

const SHIPPING_METHODS = ['standard', 'express', 'pickup'];
const MIN_ITEMS = 1;
const MAX_ITEMS = 50;

function validateShipment(request) {
  if (!request || typeof request !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  if (!Array.isArray(request.items)) {
    return { ok: false, code: 'ITEMS_NOT_ARRAY' };
  }
  if (request.items.length < MIN_ITEMS) {
    return { ok: false, code: 'TOO_FEW_ITEMS' };
  }
  if (request.items.length > MAX_ITEMS) {
    return { ok: false, code: 'TOO_MANY_ITEMS' };
  }
  if (!SHIPPING_METHODS.includes(request.method)) {
    return { ok: false, code: 'UNKNOWN_METHOD' };
  }
  return { ok: true, code: null };
}

module.exports = { validateShipment, SHIPPING_METHODS, MIN_ITEMS, MAX_ITEMS };

=============== FILE: src/shipment.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateShipment } = require('./shipment');

test('accepts a standard shipment', () => {
  const result = validateShipment({ method: 'standard', items: ['sku-1'] });
  assert.equal(result.ok, true);
});
