'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseExpr, nextRunUtc } = require('../src/cron');
const schedules = require('../src/schedules');

// Monday 2026-01-05 00:00 UTC
const BASE = Date.UTC(2026, 0, 5, 0, 0);

// Registry audit: every entry is planned by the runner, and the run the runner
// plans lands on the minute, hour and month the entry is configured for.
function auditEntry(entry) {
  const p = parseExpr(entry.expr);
  const run = nextRunUtc(entry.expr, BASE);
  assert.ok(run, `${entry.name}: nothing planned`);
  assert.ok(p.minute.values.has(run.getUTCMinutes()), `${entry.name}: minute`);
  assert.ok(p.hour.values.has(run.getUTCHours()), `${entry.name}: hour`);
  assert.ok(p.month.values.has(run.getUTCMonth() + 1), `${entry.name}: month`);
}

for (const entry of schedules) {
  test(`${entry.name} is scheduled the way it is configured`, () => auditEntry(entry));
}

test('the whole registry is accepted by the runner', () => {
  for (const entry of schedules) parseExpr(entry.expr);
});
