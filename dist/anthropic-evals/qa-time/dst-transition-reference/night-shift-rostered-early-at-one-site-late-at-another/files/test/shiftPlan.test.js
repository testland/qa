'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nightShifts, addDays } = require('../src/shiftPlan.js');
const { localLabel } = require('../src/zoneTime.js');

test('one shift per day is generated', () => {
  assert.equal(nightShifts('nyc-1', '2026-06-15', 7).length, 7);
});

test('addDays walks calendar dates', () => {
  assert.equal(addDays('2026-06-28', 5), '2026-07-03');
});

test('an ordinary June night in New York runs 02:30Z to 10:30Z', () => {
  const [shift] = nightShifts('nyc-1', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-16T02:30:00.000Z');
  assert.equal(shift.endsAt.toISOString(), '2026-06-16T10:30:00.000Z');
});

test('an ordinary June night in London hands over at 06:30 local', () => {
  const [shift] = nightShifts('ldn-2', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-15T21:30:00.000Z');
  assert.equal(localLabel(shift.endsAt, shift.zone), '2026-06-16T06:30:00');
});

test('an ordinary June night on Lord Howe runs 12:00Z to 20:00Z', () => {
  const [shift] = nightShifts('lhi-4', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-15T12:00:00.000Z');
  assert.equal(shift.endsAt.toISOString(), '2026-06-15T20:00:00.000Z');
});

test('an ordinary June night in Bangalore is eight paid hours', () => {
  const [shift] = nightShifts('blr-3', '2026-06-15', 1);
  assert.equal(shift.startsAt.toISOString(), '2026-06-15T17:00:00.000Z');
  assert.equal(shift.endsAt.toISOString(), '2026-06-16T01:00:00.000Z');
  assert.equal(shift.paidHours, 8);
});
