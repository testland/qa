'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTally } = require('./tally');

test('accumulates postings on a single thread', () => {
  const tally = createTally(new SharedArrayBuffer(8));

  tally.post(1200);
  tally.post(305);

  assert.equal(tally.cents(), 1505);
  assert.equal(tally.postings(), 2);
});
