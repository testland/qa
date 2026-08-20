const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { validate } = require('../../src/promos');

Given('a cart worth ${float}', function (amount) {
  this.cartTotal = amount;
});

When('I enter a welcome code', function () {
  this.result = validate('WELCOME10');
});

When('I enter an expired code', function () {
  this.result = validate('EXPIRED50');
});

When('I enter an unknown code', function () {
  this.result = validate('NOTREAL');
});

When('I enter nothing', function () {
  this.result = validate('');
});

When('I enter a code from another region', function () {
  this.result = validate('REGION5');
});

Then('the promo is accepted', function () {
  assert.strictEqual(this.result.valid, true);
});

Then('I see the message {string}', function (message) {
  assert.strictEqual(this.result.valid, false);
  assert.strictEqual(this.result.message, message);
});
