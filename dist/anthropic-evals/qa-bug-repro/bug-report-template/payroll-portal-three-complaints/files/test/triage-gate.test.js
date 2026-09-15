'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { makeRecord } = require('../src/bug-record');
const { audit } = require('../src/triage-gate');

function record(overrides = {}) {
  return makeRecord({
    id: 'PW-4410',
    title: 'Year-to-date column missing from payroll export',
    surface: 'payroll export',
    severity: 'Major',
    urgency: 'P2',
    steps: ['Open Payroll then Export', 'Download the finance file'],
    commit: '9c1f4ab',
    observed: 'The downloaded file has no year-to-date column',
    expected: 'The downloaded file carries the year-to-date column',
    ...overrides,
  });
}

test('a complete record passes the gate', () => {
  assert.strictEqual(audit(record()).verdict, 'pass');
});

test('a title joining two failures is blocked', () => {
  const r = audit(record({ title: 'Export column missing and reports page slow' }));
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.rule === 'single-clause-title'));
});

test('a reproduction that is not pinned to a commit is blocked', () => {
  const r = audit(record({ commit: 'Production' }));
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.rule === 'repro-pinned'));
});

test('a record with no surface is blocked', () => {
  const r = audit({ ...record(), surface: '' });
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.detail === 'missing surface'));
});
