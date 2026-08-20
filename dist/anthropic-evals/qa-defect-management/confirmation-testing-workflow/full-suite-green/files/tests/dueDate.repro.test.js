'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dueDateFor } = require('../src/dueDate');

test('BUG-3902: 7-day due date for a UTC+13 user created late in the UTC day', () => {
  assert.equal(dueDateFor('2026-03-30T22:30:00Z', 780, 7), '2026-04-07');
});
