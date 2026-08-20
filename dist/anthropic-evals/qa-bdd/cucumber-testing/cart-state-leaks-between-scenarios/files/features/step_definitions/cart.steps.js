const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { Cart } = require('../../src/cart');

let cart;
let promoAccepted;

Given('an empty cart', () => {
  cart = new Cart();
});

Given('the cart contains {int} of {string} at ${float}', (qty, sku, price) => {
  cart.add(sku, qty, price);
});

When('I apply the promo code {string}', (code) => {
  promoAccepted = cart.applyPromo(code);
});

Then('the cart holds {int} items', (expected) => {
  assert.strictEqual(cart.itemCount(), expected);
});

Then('the total is ${float}', (expected) => {
  assert.strictEqual(cart.total(), expected);
});

Then('the promo is rejected', () => {
  assert.strictEqual(promoAccepted, false);
});
