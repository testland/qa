'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cart = require('../src/cart');

test('formatPrice renders cents as dollars', () => {
  assert.equal(cart.formatPrice(129900), '$1299.00');
  assert.equal(cart.formatPrice(0), '$0.00');
});

test('purchasable keeps only in_stock rows', () => {
  const rows = [
    { id: 1, availability: 'in_stock' },
    { id: 2, availability: 'backorder' },
    { id: 3, availability: 'discontinued' },
  ];
  assert.deepEqual(cart.purchasable(rows).map((r) => r.id), [1]);
});

test('free shipping threshold is inclusive', () => {
  assert.equal(cart.qualifiesForFreeShipping([{ priceCents: 7500 }]), true);
  assert.equal(cart.qualifiesForFreeShipping([{ priceCents: 7499 }]), false);
});

test('toCartRow projects only the three fields the cart renders', () => {
  const row = cart.toCartRow({ id: 101, name: 'Aeron Chair', priceCents: 129900, sku: 'AER-B2-GR' });
  assert.deepEqual(row, { key: 101, label: 'Aeron Chair', price: '$1299.00' });
});
