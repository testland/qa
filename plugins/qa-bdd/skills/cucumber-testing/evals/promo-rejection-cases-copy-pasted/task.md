# Every new promo rule costs us two files and a copy-paste

## Problem Description

`features/promo.feature` covers one accepted code and four rejection cases. The
four rejections are the same three lines each time; only the code that goes in
and the message that comes out differ. Each of them also has its own step
definition in `features/step_definitions/promo.steps.js`, which is where the
real cost shows up - `I enter an expired code`, `I enter an unknown code`,
`I enter nothing`, `I enter a code from another region`, one function each,
all of them one line.

Backend shipped a fifth rejection last week: a code that has already been
redeemed comes back with "This code has already been used". `src/promos.js`
knows about it (`USEDONCE`); the spec does not. Nobody wants to add the sixth
copy of the same three lines plus another single-line function, so it has been
sitting untested for a week.

Support reads this file in sprint review, so it has to stay readable to someone
who does not write JavaScript.

## Output Specification

Rework `features/promo.feature` and `features/step_definitions/promo.steps.js`
so that:

1. The rejection cases are expressed once, with the code that goes in and the
   message that comes out listed as data alongside it. Someone adding the
   seventh rejection next month must be able to do it by adding one line to the
   feature file and touching no JavaScript at all.
2. The already-used case (`USEDONCE`, "This code has already been used") is
   covered.
3. The accepted-code case keeps its own scenario - it asserts a different
   outcome and must not be folded in with a blank message.
4. The five single-purpose `When` definitions are gone.
5. `src/promos.js` must not change, and the step sentences must stay in the
   language support already reads - no element ids, URLs, or function names in
   the feature file.

## Input Files

Extract the following files before beginning.

=============== FILE: features/promo.feature ===============
Feature: Promo code validation

  Scenario: A valid code is accepted
    Given a cart worth $40.00
    When I enter a welcome code
    Then the promo is accepted

  Scenario: An expired code is refused
    Given a cart worth $40.00
    When I enter an expired code
    Then I see the message "This code has expired"

  Scenario: An unknown code is refused
    Given a cart worth $40.00
    When I enter an unknown code
    Then I see the message "Code not found"

  Scenario: An empty code is refused
    Given a cart worth $40.00
    When I enter nothing
    Then I see the message "Please enter a code"

  Scenario: A code issued for another region is refused
    Given a cart worth $40.00
    When I enter a code from another region
    Then I see the message "This code is not valid in your region"

=============== FILE: features/step_definitions/promo.steps.js ===============
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

=============== FILE: src/promos.js ===============
const CODES = {
  WELCOME10: { valid: true },
  EXPIRED50: { valid: false, message: 'This code has expired' },
  REGION5: { valid: false, message: 'This code is not valid in your region' },
  USEDONCE: { valid: false, message: 'This code has already been used' },
};

function validate(code) {
  if (code === '') return { valid: false, message: 'Please enter a code' };
  const known = CODES[code];
  if (!known) return { valid: false, message: 'Code not found' };
  return known;
}

module.exports = { validate };

=============== FILE: cucumber.js ===============
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js'],
    format: ['progress'],
  },
};

=============== FILE: package.json ===============
{
  "name": "promo-specs",
  "private": true,
  "scripts": {
    "bdd": "cucumber-js"
  },
  "devDependencies": {
    "@cucumber/cucumber": "^10.9.0"
  }
}
