import test from 'node:test';
import assert from 'node:assert/strict';
import { excessFor, payable } from '../src/claim-amount.js';

test('excess depends on the tier', () => {
  assert.equal(excessFor('standard'), 15000);
  assert.equal(excessFor('enhanced'), 5000);
});

test('an unknown tier is rejected', () => {
  assert.throws(() => excessFor('platinum'), /unknown tier: platinum/);
});

test('a claim below the excess pays nothing', () => {
  assert.equal(payable(12000, 'standard'), 0);
});

test('a claim above the cap is capped', () => {
  assert.equal(payable(9999999, 'standard'), 250000);
});

test('a normal claim pays the net amount', () => {
  assert.equal(payable(40000, 'enhanced'), 35000);
});

test('a non-integer claim is rejected', () => {
  assert.throws(() => payable(12.5, 'standard'), RangeError);
});
