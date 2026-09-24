'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toQuoteView, discountApplies, cheapestRate, etaLabel } = require('../src/quote');

test('toQuoteView keeps only the four fields the page renders', () => {
  const view = toQuoteView({
    currency: 'USD',
    subtotal_cents: 12000,
    discount_amount_cents: 1500,
    tax_cents: 840,
    total_cents: 11340,
    quote_id: 'q_88',
    experiment_bucket: 'b',
    cache_hit: true,
  });
  assert.deepEqual(view, { subtotal: 12000, discount: 1500, total: 11340, currency: 'USD' });
});

test('discountApplies is false at zero', () => {
  assert.equal(discountApplies({ discount_amount_cents: 0 }), false);
  assert.equal(discountApplies({ discount_amount_cents: 1 }), true);
});

test('cheapestRate picks the lowest amount', () => {
  const rates = [
    { carrier: 'A', amount_cents: 900, eta_days: 5 },
    { carrier: 'B', amount_cents: 750, eta_days: 7 },
  ];
  assert.equal(cheapestRate(rates).carrier, 'B');
  assert.equal(cheapestRate([]), null);
});

test('etaLabel renders the eta', () => {
  assert.equal(etaLabel({ eta_days: 3 }), '3 business days');
});
