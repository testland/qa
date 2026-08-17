# Every money step re-parses "£49.00" its own way

## Problem Description

`features/step_definitions/billing.steps.js` has four steps that take a money
amount and each of them contains the same line to turn `"£49.00"` into the
integer pence `src/billing.js` works in. Last sprint we spiked the £1,200.00
enterprise tier and three of those four steps broke, because `parseFloat` stops
at the comma and £1,200.00 quietly became 100 pence. The fourth step did not
break, which took an afternoon to work out.

The plan steps have the same shape from the other direction: four different step
bodies call `planNamed` themselves and then work with the result, so "what does a
step get handed" is answered differently in every function.

The money amounts also have to be written in quotes in the feature file, because
that is what the current step sentences require. Finance reads this file and asks
every time why `£60.00` is in quotes when `12 days` is not.

## Output Specification

1. No step body may convert a written value any more. A step that deals with an
   amount must receive the integer number of pence; a step that deals with a plan
   must receive the plan object from `src/billing.js`. Each of those two
   conversions must exist in exactly one place in the suite.
2. Money amounts in the feature are written without quotes - `£60.00`, not
   `"£60.00"`. The step sentences must not otherwise change.
3. An amount with a thousands separator must work anywhere an amount is
   accepted. Add this scenario and make it pass:

       Scenario: A large credit balance absorbs the upgrade
         Given a customer on the Team plan
         And a credit balance of £1,200.00
         And 12 days remain in the 30 day cycle
         When they upgrade to the Enterprise plan
         Then their balance is £1,140.00

4. `src/billing.js` is production code and must not change.

## Input Files

Extract the following files before beginning.

=============== FILE: features/billing.feature ===============
Feature: Subscription billing

  Scenario: Upgrading mid-cycle is prorated
    Given a customer on the Team plan
    And 12 days remain in the 30 day cycle
    When they upgrade to the Enterprise plan
    Then they are charged "£60.00" today

  Scenario: Downgrading mid-cycle credits the difference
    Given a customer on the Enterprise plan
    And 15 days remain in the 30 day cycle
    When they downgrade to the Team plan
    Then they are credited "£75.00"

  Scenario: A credit balance covers the charge
    Given a customer on the Team plan
    And a credit balance of "£100.00"
    And 12 days remain in the 30 day cycle
    When they upgrade to the Enterprise plan
    Then their balance is "£40.00"

=============== FILE: features/step_definitions/billing.steps.js ===============
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

=============== FILE: src/billing.js ===============
const PLANS = {
  Free: { name: 'Free', monthly: 0 },
  Team: { name: 'Team', monthly: 4900 },
  Enterprise: { name: 'Enterprise', monthly: 19900 },
};

function planNamed(name) {
  const plan = PLANS[name];
  if (!plan) throw new Error(`Unknown plan: ${name}`);
  return plan;
}

function prorate(from, to, daysRemaining, daysInCycle) {
  return Math.round(((to.monthly - from.monthly) * daysRemaining) / daysInCycle);
}

module.exports = { PLANS, planNamed, prorate };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "billing-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
