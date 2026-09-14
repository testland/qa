'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { record, disputes, reset } = require('../../src/disputeTracker');

test('a recorded dispute is readable back', () => {
  reset();
  record({ object: 'dispute', id: 'dp_unit_1', status: 'needs_response', amount: 2400 });
  assert.equal(disputes().length, 1);
  assert.equal(disputes()[0].status, 'needs_response');
});

test('reset clears what was recorded', () => {
  reset();
  record({ object: 'dispute', id: 'dp_unit_2', status: 'won', amount: 100 });
  reset();
  assert.equal(disputes().length, 0);
});
