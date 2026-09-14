'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBeacon } = require('../src/vitals-payload.js');

test('layout shift is scaled to an integer', () => {
  const b = buildBeacon({ name: 'CLS', value: 0.1432, rating: 'needs-improvement' }, {});
  assert.equal(b.value, 143);
});

test('timing metrics are rounded to milliseconds', () => {
  const b = buildBeacon({ name: 'LCP', value: 2213.7, rating: 'good' }, { route: '/portal' });
  assert.equal(b.value, 2214);
  assert.equal(b.route, '/portal');
});

test('missing context falls back to unknown', () => {
  const b = buildBeacon({ name: 'INP', value: 180 }, {});
  assert.equal(b.build, 'unknown');
  assert.equal(b.rating, 'unknown');
});

test('a malformed metric throws', () => {
  assert.throws(() => buildBeacon(null, {}), TypeError);
});
