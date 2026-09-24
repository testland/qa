'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startTimer, elapsedMs, recordLatency, mergeCollectorRows } = require('../src/slaTimer.js');

const T0 = Date.parse('2026-12-29T14:00:00.000Z');

test('elapsed is the gap the clock reports', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 250;
  assert.equal(elapsedMs(timer), 250);
});

test('a sample carries the instant the call finished', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 180;
  assert.deepEqual(recordLatency(timer, 200), {
    observedAt: '2026-12-29T14:00:00.180Z',
    elapsedMs: 180,
    withinBudget: true,
  });
});

test('a call over the budget is not within budget', () => {
  let now = T0;
  const timer = startTimer(() => now);
  now = T0 + 410;
  assert.equal(recordLatency(timer, 200).withinBudget, false);
});

test('a sample taken with the default clock is stamped with a calendar instant', () => {
  const before = Date.now();
  const row = recordLatency(startTimer(), 200);
  const stamped = Date.parse(row.observedAt);
  assert.ok(Number.isFinite(stamped), 'observedAt must parse as an instant');
  assert.ok(Math.abs(stamped - before) < 60000, 'observedAt must name roughly now');
});

test('rows from the three collectors merge into one ordered sequence', () => {
  const eu = [{ observedAt: '2026-12-29T14:00:02.000Z', elapsedMs: 12, withinBudget: true }];
  const us = [{ observedAt: '2026-12-29T14:00:01.000Z', elapsedMs: 30, withinBudget: true }];
  const ap = [{ observedAt: '2026-12-29T14:00:03.000Z', elapsedMs: 9, withinBudget: true }];
  assert.deepEqual(mergeCollectorRows(eu, us, ap).map((r) => r.elapsedMs), [30, 12, 9]);
});
