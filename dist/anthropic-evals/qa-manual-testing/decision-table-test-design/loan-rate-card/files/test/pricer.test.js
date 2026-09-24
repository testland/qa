'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { priceApr } = require('../src/pricer');

test('a 700-band applicant with nothing else gets the base discount', () => {
  const r = priceApr({ creditScore: 720, termMonths: 48, holdsCurrentAccount: false, amountEur: 10000 });
  assert.strictEqual(r.aprPoints, 8.4);
});

test('the 780 band replaces the 700 discount rather than adding to it', () => {
  const r = priceApr({ creditScore: 800, termMonths: 48, holdsCurrentAccount: false, amountEur: 10000 });
  assert.strictEqual(r.aprPoints, 7.4);
});

test('every discount at once on a long term', () => {
  const r = priceApr({ creditScore: 800, termMonths: 72, holdsCurrentAccount: true, amountEur: 30000 });
  assert.strictEqual(r.aprPoints, 7.5);
});
