'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDueLabel } = require('../src/dueDate');

test('due label is day/month/year', () => {
  assert.equal(formatDueLabel('2026-04-07'), '07/04/2026');
});
