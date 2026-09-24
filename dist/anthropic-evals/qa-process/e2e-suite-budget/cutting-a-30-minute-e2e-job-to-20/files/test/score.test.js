'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { score, median } = require('../lib/score');

const base = {
  regressionsCaught: 2,
  valueTier: 3,
  runtimeMin: 2.0,
  flakeRate: 0.05,
  maintenanceNorm: 1,
};

test('catching more bugs for the same cost scores higher', () => {
  assert.ok(score({ ...base, regressionsCaught: 4 }) > score(base));
});

test('a more important test scores higher for the same cost', () => {
  assert.ok(score({ ...base, valueTier: 5 }) > score(base));
});

test('a slower test scores lower for the same return', () => {
  assert.ok(score({ ...base, runtimeMin: 4.0 }) < score(base));
});

test('a test touched more often scores lower', () => {
  assert.ok(score({ ...base, maintenanceNorm: 3 }) < score(base));
});

test('median of an odd-length list', () => {
  assert.equal(median([5, 1, 3]), 3);
});
