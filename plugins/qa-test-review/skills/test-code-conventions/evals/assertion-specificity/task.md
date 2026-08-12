# Cart tests pass but do not pin anything down

## Problem Description

`src/cart.test.js` is green. During an incident we discovered it stays green
when the tax calculation is wrong, when the cart returns the wrong number of
items, and when the coupon validation does not throw at all.

The behaviour of `src/cart.js` is correct today. We want the tests to
actually hold it in place.

## Output Specification

1. Rewrite the assertions in `src/cart.test.js` so each test would fail if the
   behaviour it describes changed. Keep the same three scenarios and do not
   change `src/cart.js`.
2. Produce `assertion-review.md` listing each assertion you replaced, what it
   would have let through, and what it asserts now.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout",
  "version": "1.8.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/cart.js ===============
'use strict';

const TAX_RATE = 0.2;

class CouponError extends Error {
  constructor(code) {
    super(`Unknown coupon: ${code}`);
    this.name = 'CouponError';
    this.code = code;
  }
}

function emptyCart() {
  return { items: [] };
}

function addToCart(cart, item) {
  return { items: [...cart.items, { sku: item.sku, priceCents: item.priceCents, qty: item.qty }] };
}

function priceCart(cart) {
  const subtotalCents = cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function applyCoupon(cart, code) {
  if (code !== 'WELCOME10') {
    throw new CouponError(code);
  }
  return { ...cart, discountCents: Math.round(priceCart(cart).subtotalCents * 0.1) };
}

module.exports = { emptyCart, addToCart, priceCart, applyCoupon, CouponError, TAX_RATE };

=============== FILE: src/cart.test.js ===============
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
