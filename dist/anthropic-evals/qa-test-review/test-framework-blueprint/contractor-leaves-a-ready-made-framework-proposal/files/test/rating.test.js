'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteFor } = require('../src/rating');

test('quotes a mid-band parcel against the zone multiplier', () => {
  assert.equal(quoteFor({ weightKg: 4, zone: 'B' }), 1850);
});

test('quotes above the top band per excess kilo', () => {
  assert.equal(quoteFor({ weightKg: 25, zone: 'C' }), 4880);
});

test('rejects an unknown zone', () => {
  assert.throws(() => quoteFor({ weightKg: 4, zone: 'Z' }), /unknown zone/);
});
