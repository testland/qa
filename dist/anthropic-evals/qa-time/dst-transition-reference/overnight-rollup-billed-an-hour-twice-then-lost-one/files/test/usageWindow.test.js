'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dayWindow, billableSeconds } = require('../src/usageWindow.js');

const windowSeconds = (w) => (w.end.getTime() - w.start.getTime()) / 1000;

test('an ordinary June day in New York is 86400 seconds', () => {
  assert.equal(windowSeconds(dayWindow('2026-06-15', 'America/New_York')), 86400);
});

test('an ordinary June day in Kolkata starts at 18:30 UTC the day before', () => {
  const w = dayWindow('2026-06-15', 'Asia/Kolkata');
  assert.equal(w.start.toISOString(), '2026-06-14T18:30:00.000Z');
});

test('an ordinary June day in Havana starts at 04:00 UTC', () => {
  const w = dayWindow('2026-06-15', 'America/Havana');
  assert.equal(w.start.toISOString(), '2026-06-15T04:00:00.000Z');
  assert.equal(windowSeconds(w), 86400);
});

test('a session covering an ordinary day bills the whole day', () => {
  const sessions = [{ start: '2026-06-15T04:00:00Z', end: '2026-06-16T04:00:00Z' }];
  assert.equal(billableSeconds(sessions, '2026-06-15', 'America/New_York'), 86400);
});

test('a session after the window is not billed', () => {
  const sessions = [{ start: '2026-06-16T05:00:00Z', end: '2026-06-16T06:00:00Z' }];
  assert.equal(billableSeconds(sessions, '2026-06-15', 'America/New_York'), 0);
});
