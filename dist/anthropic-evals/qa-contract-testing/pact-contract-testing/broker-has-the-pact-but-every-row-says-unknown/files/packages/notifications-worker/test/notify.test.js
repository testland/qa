'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pending, summarise } = require('../src/notify');

test('pending drops anything already sent', () => {
  const rows = [{ id: 1, sent: true }, { id: 2, sent: false }];
  assert.deepEqual(pending(rows).map((r) => r.id), [2]);
});

test('summarise counts the unsent rows', () => {
  assert.equal(summarise([{ sent: true }, { sent: false }, { sent: false }]), '2 unsent');
});
