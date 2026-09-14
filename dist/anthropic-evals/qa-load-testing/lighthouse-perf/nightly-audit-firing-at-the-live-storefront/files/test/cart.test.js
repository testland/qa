import test from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, taxFor, cartTotal } from '../src/cart.js';

const items = [
  { sku: 'mug-4pk', unitPrice: 1800, qty: 2 },
  { sku: 'tea-towel', unitPrice: 650, qty: 3 },
];

test('subtotal sums line totals', () => {
  assert.equal(subtotal(items), 5550);
});

test('tax rounds to the nearest penny', () => {
  assert.equal(taxFor(items, 'GB'), 1110);
});

test('an unknown country is rejected', () => {
  assert.throws(() => taxFor(items, 'ZZ'), /no tax rate for ZZ/);
});

test('cart total is subtotal plus tax', () => {
  assert.equal(cartTotal(items, 'IE'), 6827);
});
