'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { normalize } = require('../src/triage-policy');

test('a ticket whose two values already agree comes back unchanged', () => {
  const t = { id: 'WEB-1', priority: 'High', severity: '2 - High' };
  assert.deepStrictEqual(normalize(t), t);
});

test('a ticket with an unrecognised scheduling value is left alone', () => {
  const t = { id: 'WEB-2', priority: 'Blocker', severity: '' };
  assert.deepStrictEqual(normalize(t), t);
});
