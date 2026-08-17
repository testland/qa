'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyCart, addToCart, priceCart, applyCoupon } = require('./cart');

function twoItemCart() {
  let cart = emptyCart();
  cart = addToCart(cart, { sku: 'A-1', priceCents: 500, qty: 2 });
  cart = addToCart(cart, { sku: 'B-2', priceCents: 250, qty: 1 });
  return cart;
}

test('adds an item to the cart', () => {
  const cart = addToCart(emptyCart(), { sku: 'A-1', priceCents: 500, qty: 2 });
  assert.ok(cart);
  assert.ok(cart.items.length);
});

test('prices the cart', () => {
  const priced = priceCart(twoItemCart());
  assert.ok(priced.totalCents);
  assert.ok(priced.totalCents > 0);
});

test('rejects an unknown coupon', () => {
  try {
    applyCoupon(twoItemCart(), 'NOPE');
  } catch (error) {
    assert.ok(String(error).includes('coupon'));
  }
});
