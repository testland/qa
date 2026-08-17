'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planPrice, prorate, describePlan } = require('./subscription');

test('works', () => {
  assert.equal(planPrice('team', 5), 5000);
  assert.equal(planPrice('enterprise', 5), 12500);
  const prorated = prorate(5000, 15, 30);
  assert.equal(prorated, 2500);
  assert.equal(describePlan('team').name, 'Team');
  assert.equal(describePlan('team').seatCap, 25);
});

test('test2', () => {
  assert.equal(prorate(1000, 0, 30), 0);
  assert.throws(() => planPrice('startup', 5));
});
