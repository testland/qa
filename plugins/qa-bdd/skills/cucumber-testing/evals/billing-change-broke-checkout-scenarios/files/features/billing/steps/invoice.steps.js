const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { setField } = require('../../../src/invoice');

Given('an invoice for ${float}', function (total) {
  this.invoice = { total };
});

When(/^I enter "(.*)" in the (.*) field$/, function (value, field) {
  this.result = setField(this.invoice, field, value);
});

Then('the invoice reference is {string}', function (expected) {
  assert.strictEqual(this.invoice.reference, expected);
});
