'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { currencyFor, formatMoney, isRtl } = require('../src/format-money.js');

test('each shipped locale has a currency', () => {
  assert.equal(currencyFor('en-US'), 'USD');
  assert.equal(currencyFor('de-DE'), 'EUR');
  assert.equal(currencyFor('ar-EG'), 'EGP');
});

test('an unconfigured locale is rejected rather than guessed', () => {
  assert.throws(() => currencyFor('fr-CA'), RangeError);
});

test('the US subtotal keeps a leading dollar sign', () => {
  assert.equal(formatMoney(499, 'en-US'), '$4.99');
});

test('the German subtotal uses a comma and a trailing euro sign', () => {
  const s = formatMoney(499, 'de-DE');
  assert.match(s, /^4,99 /);
  assert.ok(s.includes('€'));
});

test('Arabic is recognised as right-to-left', () => {
  assert.equal(isRtl('ar-EG'), true);
  assert.equal(isRtl('de-DE'), false);
});
