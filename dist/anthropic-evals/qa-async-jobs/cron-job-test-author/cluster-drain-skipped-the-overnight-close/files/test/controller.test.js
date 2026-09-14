'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { simulate, firesAt } = require('../src/controller');

const MIN = 60000;
const HOUR = 60 * MIN;
const at = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const cj = (spec) => ({ apiVersion: 'batch/v1', kind: 'CronJob', metadata: { name: 'example' }, spec });
const typeCount = (events, type) => events.filter((e) => e.type === type).length;

test('an hourly schedule creates one Job an hour', () => {
  const r = simulate(cj({ schedule: '0 * * * *' }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 6, 0),
    durationMs: 5 * MIN,
  });
  assert.equal(typeCount(r.events, 'JobCreated'), 6);
  assert.equal(typeCount(r.events, 'JobCompleted'), 6);
});

test('a schedule is read in the zone named on the object', () => {
  const spec = { schedule: '0 9 * * *', timeZone: 'Europe/Berlin' };
  assert.equal(firesAt(spec, at(2026, 6, 10, 7, 0)), true);
  assert.equal(firesAt(spec, at(2026, 6, 10, 9, 0)), false);
});

test('a run that is still going blocks the next slot under Forbid', () => {
  const r = simulate(cj({ schedule: '0 * * * *', concurrencyPolicy: 'Forbid', startingDeadlineSeconds: 300 }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 3, 0),
    durationMs: 90 * MIN,
  });
  const created = r.events.filter((e) => e.type === 'JobCreated').map((e) => e.at);
  assert.deepEqual(created, [at(2026, 6, 10, 0, 0), at(2026, 6, 10, 2, 0)]);
});

test('a slot the controller could not act on is dropped once its deadline has passed', () => {
  const r = simulate(cj({ schedule: '0 3 * * *', startingDeadlineSeconds: 600 }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 12, 0),
    durationMs: 20 * MIN,
    unavailable: [{ fromMs: at(2026, 6, 10, 2, 50), toMs: at(2026, 6, 10, 4, 0) }],
  });
  assert.equal(typeCount(r.events, 'JobCreated'), 0);
  assert.equal(typeCount(r.events, 'ScheduleMissed'), 1);
});
