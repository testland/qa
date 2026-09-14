const test = require('node:test');
const assert = require('node:assert/strict');
const { rateFor } = require('../src/tax');

test('low amounts use the first bracket', () => {
  assert.equal(rateFor(500), 0.1);
});

test('mid amounts use the second bracket', () => {
  assert.equal(rateFor(2500), 0.2);
});

test('amounts above every bracket use the top rate', () => {
  assert.equal(rateFor(9000), 0.35);
});
