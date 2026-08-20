'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { addMoney, formatMoney } = require('../src/money');

test('adds two amounts in the same currency', () => {
  assert.deepEqual(addMoney({ cents: 100, currency: 'EUR' }, { cents: 250, currency: 'EUR' }), {
    cents: 350,
    currency: 'EUR',
  });
});

test('formats an amount', () => {
  assert.equal(formatMoney({ cents: 350, currency: 'EUR' }), '3.50 EUR');
});
