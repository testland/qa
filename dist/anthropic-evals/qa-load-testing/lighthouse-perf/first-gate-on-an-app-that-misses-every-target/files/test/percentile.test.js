'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { percentile } = require('../src/percentile.js');

test('p75 of ten ordered values', () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75), 8);
});

test('p50 of a single value is that value', () => {
  assert.equal(percentile([5], 50), 5);
});

test('unordered input is sorted first', () => {
  assert.equal(percentile([9, 1, 4, 7], 50), 4);
});

test('empty input throws', () => {
  assert.throws(() => percentile([], 75), RangeError);
});
