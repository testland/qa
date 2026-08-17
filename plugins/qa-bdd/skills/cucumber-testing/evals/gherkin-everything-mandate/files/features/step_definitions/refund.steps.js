const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { refundFor, DAY } = require('../../src/refund-policy');

Given('a delivered order worth ${float} in the {string} category', function (total, category) {
  this.order = { total, category, deliveredAt: 0 };
});

When('a refund is requested {int} days later', function (days) {
  this.decision = refundFor(this.order, days * DAY);
});

Then('the refund is approved for ${float}', function (amount) {
  assert.strictEqual(this.decision.approved, true);
  assert.strictEqual(this.decision.amount, amount);
});

Then('the refund is refused because {string}', function (reason) {
  assert.strictEqual(this.decision.approved, false);
  assert.strictEqual(this.decision.reason, reason);
});
