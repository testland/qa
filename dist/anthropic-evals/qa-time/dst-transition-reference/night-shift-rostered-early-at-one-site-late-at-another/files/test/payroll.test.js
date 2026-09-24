'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { payrollRows } = require('../src/payroll.js');

test('an ordinary June night in Bangalore exports one line', () => {
  assert.deepEqual(payrollRows('blr-3', '2026-06-15', 1), [
    { siteId: 'blr-3', night: '2026-06-15', hours: 8, gross: 78 },
  ]);
});

test('a fortnight in New York exports one line per night', () => {
  const rows = payrollRows('nyc-1', '2026-06-01', 14);
  assert.equal(rows.length, 14);
  assert.equal(rows[0].night, '2026-06-01');
  assert.equal(rows[13].night, '2026-06-14');
});
