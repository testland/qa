'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal } = require('../src/cart');

test('BUG-3318: stacked promos never drive a line total negative', () => {
  const line = { sku: 'A-1', unitCents: 1000, quantity: 1 };
  const promos = [
    { sku: 'A-1', rate: 0.5 },
    { sku: 'A-1', rate: 0.75 },
  ];
  assert.equal(lineTotal(line, promos), 0);
});
