const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { pay } = require('../../src/checkout');

Given('a cart worth ${float}', function (total) {
  this.cart = { total };
});

When('I pay by card', function () {
  this.result = pay(this.cart, { card: '4242' });
});

When('the card is declined', function () {
  this.result = pay(this.cart, { card: null });
});

Then('the order is confirmed', function () {
  assert.strictEqual(this.result.confirmed, true);
});

Then('the order is not created', function () {
  assert.strictEqual(this.result.confirmed, false);
});
