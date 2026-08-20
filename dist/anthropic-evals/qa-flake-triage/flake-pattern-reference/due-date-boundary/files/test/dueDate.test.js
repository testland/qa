'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isDueToday, dueLabel } = require('../src/dueDate');

const today = new Date().toISOString().slice(0, 10);

test('an invoice due later today is flagged due today', () => {
  assert.equal(isDueToday(`${today}T23:30:00Z`), true);
});

test('an invoice due in thirty minutes is flagged due today', () => {
  const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  assert.equal(dueLabel(dueAt), 'Due today');
});

test('an invoice from last week is overdue', () => {
  const dueAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(dueLabel(dueAt), 'Overdue');
});
