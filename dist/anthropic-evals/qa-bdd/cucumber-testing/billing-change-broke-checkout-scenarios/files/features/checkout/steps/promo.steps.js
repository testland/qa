const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { applyPromo } = require('../../../src/promo');

Given('a cart worth ${float}', function (total) {
  this.cart = { total };
});

When('I enter {string} in the promo field', function (code) {
  this.result = applyPromo(this.cart, code);
});

Then('the total is ${float}', function (expected) {
  assert.strictEqual(this.result.total, expected);
});

Then('the message is {string}', function (expected) {
  assert.strictEqual(this.result.message, expected);
});
