'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { addItem, applyDiscount, subtotal, total } = require('../src/cart');

const CART = {
  id: 'cart-1001',
  items: [{ sku: 'DESK-1', price: 24000, qty: 1 }],
  discounts: [],
};

test('subtotal covers a single line item', () => {
  assert.equal(subtotal(CART), 24000);
});

test('a new sku is appended as its own line', () => {
  addItem(CART, { sku: 'CHAIR-9', price: 12000, qty: 1 });
  assert.equal(CART.items.length, 2);
  assert.equal(subtotal(CART), 36000);
});

test('a repeated sku merges into the line it is already on', () => {
  addItem(CART, { sku: 'DESK-1', price: 24000, qty: 2 });
  assert.equal(CART.items.length, 1);
  assert.equal(CART.items[0].qty, 3);
});

test('a ten percent discount comes off the subtotal', () => {
  applyDiscount(CART, 10);
  assert.equal(total(CART), 21600);
});

test('discounts stack additively', () => {
  applyDiscount(CART, 10);
  applyDiscount(CART, 5);
  assert.equal(total(CART), 20400);
});
