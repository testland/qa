'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextRunUtc } = require('../src/cron');

// Monday 2026-01-05 00:00 UTC
const BASE = Date.UTC(2026, 0, 5, 0, 0);

test('every fifteen minutes', () => {
  assert.equal(nextRunUtc('*/15 * * * *', BASE).toISOString(), '2026-01-05T00:15:00.000Z');
});

test('daily at 03:00', () => {
  assert.equal(nextRunUtc('0 3 * * *', BASE).toISOString(), '2026-01-05T03:00:00.000Z');
});

test('monthly on the first', () => {
  assert.equal(nextRunUtc('0 0 1 * *', BASE).toISOString(), '2026-02-01T00:00:00.000Z');
});

test('weekdays at 09:00', () => {
  assert.equal(nextRunUtc('0 9 * * 1-5', BASE).toISOString(), '2026-01-05T09:00:00.000Z');
});

test('named month', () => {
  assert.equal(nextRunUtc('0 4 1 jul *', BASE).toISOString(), '2026-07-01T04:00:00.000Z');
});
