'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cutoffInstant, isBreached } = require('../src/cutoff.js');

test('New York cutoff in January', () => {
  assert.equal(cutoffInstant('2026-01-15', 'America/New_York').toISOString(), '2026-01-15T22:00:00.000Z');
});

test('London cutoff in January', () => {
  assert.equal(cutoffInstant('2026-01-15', 'Europe/London').toISOString(), '2026-01-15T17:00:00.000Z');
});

test('Kolkata cutoff in June', () => {
  assert.equal(cutoffInstant('2026-06-15', 'Asia/Kolkata').toISOString(), '2026-06-15T11:30:00.000Z');
});

test('a response one minute after the cutoff is a breach', () => {
  assert.equal(isBreached('2026-01-20', 'America/New_York', '2026-01-20T22:01:00Z'), true);
  assert.equal(isBreached('2026-01-20', 'America/New_York', '2026-01-20T21:59:00Z'), false);
});
