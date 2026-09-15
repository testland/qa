'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { triage } = require('../src/triage');

test('a small photographed claim on an established policy is approved automatically', () => {
  const r = triage({ amountEur: 420, policyMonths: 30, photoAttached: true, garageEstimateAttached: false });
  assert.strictEqual(r.queue, 'auto-approved');
});

test('the same claim with no photo is held', () => {
  const r = triage({ amountEur: 420, policyMonths: 30, photoAttached: false, garageEstimateAttached: false });
  assert.strictEqual(r.queue, 'held-for-photo');
});

test('a policy under six months goes to fraud review whatever the amount', () => {
  const small = triage({ amountEur: 200, policyMonths: 2, photoAttached: true, garageEstimateAttached: false });
  const large = triage({ amountEur: 9000, policyMonths: 2, photoAttached: true, garageEstimateAttached: true });
  assert.strictEqual(small.queue, 'fraud-review');
  assert.strictEqual(large.queue, 'fraud-review');
});
