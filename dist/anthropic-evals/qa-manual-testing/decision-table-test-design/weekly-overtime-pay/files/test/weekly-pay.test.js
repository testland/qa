'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { weeklyTreatment } = require('../src/weekly-pay');

test('an hourly week over forty hours pays 1.5x', () => {
  const t = weeklyTreatment(
    { salaried: false, unionMember: false },
    { hoursOver40: 6, publicHolidayWorked: false, nightShift: false },
  );
  assert.strictEqual(t.overtimeRate, 1.5);
});

test('a salaried week over forty hours accrues time off in lieu instead', () => {
  const t = weeklyTreatment(
    { salaried: true },
    { hoursOver40: 6, publicHolidayWorked: false, nightShift: false },
  );
  assert.strictEqual(t.overtimeRate, null);
  assert.deepStrictEqual(t.accruals, ['time-off-in-lieu-1x']);
});

test('DEF-2211 regression: the union holiday rate is 2.5x, not 2x', () => {
  const week = { hoursOver40: 0, publicHolidayWorked: true, nightShift: false };
  assert.strictEqual(weeklyTreatment({ salaried: false, unionMember: true }, week).holidayRate, 2.5);
  assert.strictEqual(weeklyTreatment({ salaried: false, unionMember: false }, week).holidayRate, 2.0);
});
