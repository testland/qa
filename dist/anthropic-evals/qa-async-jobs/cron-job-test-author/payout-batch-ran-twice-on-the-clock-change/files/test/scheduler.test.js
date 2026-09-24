'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { localParts, firingsOnLocalDate } = require('../src/scheduler');
const jobs = require('../src/jobs');

const byName = (n) => jobs.find((j) => j.name === n);

test('localParts converts into the job zone', () => {
  const p = localParts(Date.UTC(2026, 5, 10, 5, 30), 'America/New_York');
  assert.deepEqual(p, { year: 2026, month: 6, day: 10, hour: 1, minute: 30 });
});

test('each job runs once on an ordinary day', () => {
  for (const job of jobs) {
    assert.equal(firingsOnLocalDate(job, '2026-06-10').length, 1, job.name);
  }
});

// Added 2026-09-04 with the change in ops/change-4471.md.
test('payout-reconcile runs once on the November clock change', () => {
  assert.equal(firingsOnLocalDate(byName('payout-reconcile'), '2026-11-01').length, 1);
});
