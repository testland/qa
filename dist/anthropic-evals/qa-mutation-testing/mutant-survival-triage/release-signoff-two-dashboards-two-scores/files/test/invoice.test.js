const test = require('node:test');
const assert = require('node:assert/strict');
const { lateFee, buildInvoice } = require('../src/invoice');

test('no late fee inside the grace period', () => {
  assert.equal(lateFee(0, 500), 0);
});

test('late fee applied well past the grace period', () => {
  assert.equal(lateFee(30, 500), 10);
});

test('invoice totals net and tax', () => {
  const inv = buildInvoice([{ qty: 2, unitPrice: 10 }], 0.2);
  assert.equal(inv.net, 20);
  assert.equal(inv.tax, 4);
  assert.equal(inv.total, 24);
});

test('invoice carries a currency', () => {
  const inv = buildInvoice([{ qty: 1, unitPrice: 10 }], 0);
  assert.equal(typeof inv.currency, 'string');
});
