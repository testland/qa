'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTally, TALLY_BYTES } = require('./tally');

test('accumulates postings on a single thread', () => {
  const tally = createTally(new SharedArrayBuffer(TALLY_BYTES));

  tally.post(1200);
  tally.post(305);

  assert.equal(tally.cents(), 1505);
  assert.equal(tally.postings(), 2);
});

test('carries a full night without losing precision', () => {
  const tally = createTally(new SharedArrayBuffer(TALLY_BYTES));

  tally.post(2147483647);
  tally.post(2147483647);

  assert.equal(tally.cents(), 4294967294);
  assert.equal(tally.postings(), 2);
});
