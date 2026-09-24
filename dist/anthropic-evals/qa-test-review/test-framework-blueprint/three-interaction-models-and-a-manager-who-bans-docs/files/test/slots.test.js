'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openSlots } = require('../src/slots');

test('skips a booked slot and stops before the end of the day', () => {
  assert.deepEqual(openSlots(540, 600, 20, [560]), [540, 580]);
});

test('returns nothing when every slot is booked', () => {
  assert.deepEqual(openSlots(540, 600, 20, [540, 560, 580]), []);
});
