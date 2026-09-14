'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { emptySession, addToCart, navigate, reset, cartCount } = require('../src/session.js');

test('a new session starts on home with an empty cart', () => {
  assert.deepEqual(emptySession(), { screen: 'home', cart: [], filters: {}, banner: null });
});

test('adding the same sku twice merges the lines', () => {
  const s = addToCart(addToCart(emptySession(), 'OAT-1'), 'OAT-1', 2);
  assert.deepEqual(s.cart, [{ sku: 'OAT-1', qty: 3 }]);
  assert.equal(cartCount(s), 3);
});

test('navigate does not disturb the cart', () => {
  const s = navigate(addToCart(emptySession(), 'OAT-1'), 'checkout');
  assert.equal(s.screen, 'checkout');
  assert.equal(cartCount(s), 1);
});

test('reset clears cart and screen but keeps saved filters', () => {
  const s = reset({
    screen: 'checkout',
    cart: [{ sku: 'OAT-1', qty: 4 }],
    filters: { vegan: true },
    banner: 'welcome-back',
  });
  assert.equal(s.screen, 'home');
  assert.equal(cartCount(s), 0);
  assert.deepEqual(s.filters, { vegan: true });
});

test('addToCart does not mutate its input', () => {
  const before = emptySession();
  addToCart(before, 'OAT-1');
  assert.equal(before.cart.length, 0);
});
