'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPage } = require('./browser');

test('checkout', () => {
  const page = createPage();
  page.goto('/signin');
  page.fill('email', 'ada@example.test');
  page.fill('password', 'correct-horse');
  page.check('remember me');
  page.click('Sign in');
  assert.equal(page.route(), '/dashboard');
  page.goto('/products/book-001');
  page.click('Add to cart');
  assert.equal(page.cartCount(), 1);
  page.goto('/cart');
  page.click('Place order');
  assert.equal(page.route(), '/orders/ord-1');
  assert.equal(page.flash(), 'Order confirmed for 1 item(s)');
});

test('bad password', () => {
  const page = createPage();
  page.goto('/signin');
  page.fill('email', 'ada@example.test');
  page.fill('password', 'nope');
  page.check('remember me');
  page.click('Sign in');
  assert.equal(page.signedIn(), false);
  assert.equal(page.flash(), 'Those credentials did not match');
});

test('order without signing in', () => {
  const page = createPage();
  page.goto('/products/book-001');
  page.click('Add to cart');
  page.goto('/cart');
  page.click('Place order');
  assert.equal(page.flash(), 'Please sign in');
  assert.equal(page.cartCount(), 1);
});

test('tab order', () => {
  const page = createPage();
  page.goto('/signin');
  page.press('Tab');
  assert.equal(page.focused(), 'email');
  page.press('Tab');
  assert.equal(page.focused(), 'password');
  page.press('Tab');
  assert.equal(page.focused(), 'remember me');
  page.press('Tab');
  assert.equal(page.focused(), 'Sign in');
});
