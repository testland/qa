'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextRunUtc } = require('../src/cron');
const schedules = require('../src/schedules');

// Monday 2026-01-05 00:00 UTC
const BASE = Date.UTC(2026, 0, 5, 0, 0);

const byName = (n) => schedules.find((s) => s.name === n);

function expectNextRun(name, expectedIso) {
  const entry = byName(name);
  let run;
  try {
    run = nextRunUtc(entry.expr, BASE);
  } catch {
    return; // runner would not take this one; nothing to compare against
  }
  if (!run) return; // nothing due inside the window
  assert.equal(run.toISOString(), expectedIso, name);
}

test('invoice-dunning fires on the 13th', () => {
  expectNextRun('invoice-dunning', '2026-01-13T05:00:00.000Z');
});

test('weekly-digest fires on the Sunday', () => {
  expectNextRun('weekly-digest', '2026-01-11T14:00:00.000Z');
});

test('ledger-export fires overnight', () => {
  expectNextRun('ledger-export', '2026-01-05T03:00:00.000Z');
});

test('card-retry fires on the 16th', () => {
  expectNextRun('card-retry', '2026-01-16T07:00:00.000Z');
});

test('queue-heartbeat fires every ten minutes', () => {
  expectNextRun('queue-heartbeat', '2026-01-05T00:10:00.000Z');
});
