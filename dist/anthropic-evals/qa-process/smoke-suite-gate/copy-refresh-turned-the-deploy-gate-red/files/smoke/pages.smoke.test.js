'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../src/pages');

const NAV = '<nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/checkout">Cart</a></nav>';
const CART = { items: [{ sku: 'PCL-SEED-1', price: 2410, qty: 2 }] };
const ORDER = { id: 'PCL-10023', total: 4820 };

test('smoke: home page', () => {
  const res = handle('/');
  assert.equal(res.status, 200);
  assert.equal(
    res.html,
    '<!doctype html><title>Parcelo — couriers on demand</title>' + NAV +
      '<h1>Couriers on demand</h1><p class="lede">Same-day delivery, booked in seconds.</p>' +
      '<a class="btn btn--primary" href="/pricing">See pricing</a>',
  );
});

test('smoke: pricing page', () => {
  const res = handle('/pricing');
  assert.equal(res.status, 200);
  assert.equal(
    res.html,
    '<!doctype html><title>Pricing</title>' + NAV +
      '<h1>Simple pricing</h1><ul class="tiers">' +
      '<li data-tier="starter">Starter<span class="price">£19</span></li>' +
      '<li data-tier="team">Team<span class="price">£49</span></li></ul>',
  );
});

test('smoke: checkout page', () => {
  const res = handle('/checkout', { cart: CART });
  assert.equal(res.status, 200);
  assert.equal(
    res.html,
    '<!doctype html><title>Checkout</title>' + NAV +
      '<h1>Review your order</h1><span data-testid="cart-total">£48.20</span>' +
      '<button id="place-order" class="btn btn--primary">Place order</button>',
  );
});

test('smoke: order confirmation', () => {
  const res = handle('/order/confirmation', { order: ORDER });
  assert.equal(res.status, 200);
  assert.equal(
    res.html,
    '<!doctype html><title>Order confirmed</title>' + NAV +
      '<h1>Order confirmed</h1><p>Order #PCL-10023</p>' +
      '<p>A receipt is on its way to your inbox.</p>',
  );
});

test('smoke: primary button styling', () => {
  const res = handle('/');
  assert.match(res.html, /<a class="btn btn--primary" href="\/pricing">/);
});

test('smoke: unknown page is a 404', () => {
  const res = handle('/nope');
  assert.equal(res.status, 404);
  assert.equal(res.html, '<!doctype html><title>Not found</title><h1>We cannot find that page</h1>');
});
