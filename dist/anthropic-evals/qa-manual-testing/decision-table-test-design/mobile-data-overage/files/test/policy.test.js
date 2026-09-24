'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { charge } = require('../src/billing');
const { connection } = require('../src/network');

test('a metered customer pays for data outside the bundle', () => {
  const r = charge({ unlimited: false, usedGb: 12, bundleGb: 10, roamingEu: false });
  assert.strictEqual(r.chargeEur, 40.96);
});

test('an unlimited customer at home is not charged', () => {
  assert.strictEqual(charge({ unlimited: true, usedGb: 140, roamingEu: false }).chargeEur, 0);
});

test('past the threshold without the add-on the connection is reduced', () => {
  assert.deepStrictEqual(connection({ usedGb: 140, speedPass: false }), {
    throttled: true,
    speed: '1 Mbit',
  });
});
