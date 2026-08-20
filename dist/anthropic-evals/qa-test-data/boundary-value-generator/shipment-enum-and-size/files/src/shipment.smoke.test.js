'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateShipment } = require('./shipment');

test('accepts a standard shipment', () => {
  const result = validateShipment({ method: 'standard', items: ['sku-1'] });
  assert.equal(result.ok, true);
});
