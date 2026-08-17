const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { planNamed, prorate } = require('../../src/billing');

Given('a customer on the {word} plan', function (planName) {
  this.plan = planNamed(planName);
  this.balance = 0;
});

Given('a credit balance of {string}', function (amount) {
  this.balance = Math.round(parseFloat(amount.replace('£', '')) * 100);
});

Given('{int} days remain in the {int} day cycle', function (remaining, cycle) {
  this.daysRemaining = remaining;
  this.daysInCycle = cycle;
});

When('they upgrade to the {word} plan', function (planName) {
  const target = planNamed(planName);
  this.charge = prorate(this.plan, target, this.daysRemaining, this.daysInCycle);
  this.balance -= this.charge;
  this.plan = target;
});

When('they downgrade to the {word} plan', function (planName) {
  const target = planNamed(planName);
  this.charge = prorate(this.plan, target, this.daysRemaining, this.daysInCycle);
  this.plan = target;
});

Then('they are charged {string} today', function (amount) {
  assert.strictEqual(this.charge, Math.round(parseFloat(amount.replace('£', '')) * 100));
});

Then('they are credited {string}', function (amount) {
  assert.strictEqual(-this.charge, Math.round(parseFloat(amount.replace('£', '')) * 100));
});

Then('their balance is {string}', function (amount) {
  assert.strictEqual(this.balance, Math.round(parseFloat(amount.replace('£', '')) * 100));
});
