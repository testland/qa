const test = require('node:test');
const assert = require('node:assert/strict');
const { diffRatio, isRegression } = require('./compare.js');

test('identical images have no diff', () => {
  assert.equal(diffRatio([1, 2, 3, 4], [1, 2, 3, 4]), 0);
});

test('small per-channel noise is below the sensitivity floor', () => {
  assert.equal(diffRatio([100, 100, 100, 100], [104, 96, 100, 100]), 0);
});

test('a wholly different image is all changed', () => {
  assert.equal(diffRatio([0, 0, 0, 0], [255, 255, 255, 255]), 1);
});

test('a quarter-changed image is above the default threshold', () => {
  assert.equal(isRegression([0, 0, 0, 0], [255, 0, 0, 0]), true);
});

test('mismatched sizes are rejected', () => {
  assert.throws(() => diffRatio([1, 2], [1, 2, 3]), RangeError);
});
