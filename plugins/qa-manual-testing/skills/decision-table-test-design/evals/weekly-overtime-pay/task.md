# Ruth has told us to test all thirty-two pay weeks and she has a reason

## Problem Description

Weekly pay is moving off the old payroll product onto the calculator below, and
the works council signs the test evidence. Ruth, who runs payroll, has written
the test scope herself this time and it is one line: five facts, thirty-two
arrangements, thirty-two weeks on the list, no reduction.

She is not being difficult. The 2024 migration was signed off on a reduced list
and it underpaid two hundred people for four months, because whoever reduced it
merged away a fact that turned out to matter. Her memo says she will not sit
through that again and she does not want to hear which facts someone thinks stop
mattering.

The trouble is that I have to hand her list to payroll and they have to set each
week up in the test system. Before I do that, work out whether thirty-two weeks
is a list payroll can actually run, and whether running it would catch what she
is afraid of. Then tell her.

The works agreement extract, the calculator, its tests, the HR contract fields
and the 2024 defect record are attached.

## Output Specification

1. Write `docs/test-scope-reply.md`: the answer to Ruth, saying what the test
   list is and what became of each of the thirty-two.
2. Add tests to `test/weekly-pay.test.js` backing whatever you tell her, so the
   argument is settled by running the calculator rather than by opinion.
   `npm test` must be clean.
3. Give payroll the weeks to run, each with the treatment it should produce.

Out of scope: tax, social contributions, holiday carry-over and part-time
pro-rating. Gross treatment only.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "weekly-pay",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: docs/weekly-pay-rules.md ===============
# Weekly pay rules (extract, works agreement 2026)

Hourly employees are paid 1.5x their base rate for hours worked over 40 in a
week.

Salaried employees do not receive overtime pay. They accrue time off in lieu at
1x for hours worked over 40.

Work on a public holiday is paid at 2x for hourly employees. Salaried employees
receive a day in lieu instead.

A shift that starts after 22:00 carries a night premium of EUR 4 per hour for
hourly employees. Salaried employees receive no night premium.

Union members are paid 2.5x rather than 2x for work on a public holiday. This
applies to hourly employees only. Union membership changes nothing else about
pay.

Salaried entitlements accrue independently: a salaried employee can accrue both
time off in lieu and a day in lieu in the same week.

=============== FILE: docs/ruth-directive.md ===============
# Test scope for the weekly pay migration

Five facts decide a week: over forty hours, worked a public holiday, salaried
rather than hourly, shift starting after 22:00, union member. That is thirty-two
arrangements. The test list is thirty-two weeks, one for each.

No reduction. In 2024 the list was cut down before anyone ran it and the cut
took a rule with it - see DEF-2211. Every reduction I have been shown since has
been somebody's judgement about which facts stop mattering, presented as
arithmetic. I am not signing another one.

If thirty-two weeks takes two sprints then it takes two sprints. I would rather
explain a late migration to the board than explain another round of back pay to
the works council.

- Ruth, payroll lead

=============== FILE: docs/defect-2211.md ===============
# DEF-2211 - union holiday rate lost in the 2024 migration

**Impact:** 204 hourly employees underpaid across 17 weeks, EUR 61,900 in back
pay, works council dispute closed March 2025.

**Cause.** The 2024 test scope reduced the pay cases by treating union
membership as making no difference to pay, quoting the works agreement sentence
"union membership changes nothing else about pay". That sentence is written
against the holiday rate it has just set: members are paid 2.5x rather than 2x
on a public holiday, and nothing else. The reduction dropped the 2.5x rows, the
implementation paid 2x, and no test week distinguished the two.

**Action taken.** Regression test added asserting the 2.5x union holiday rate.
Any future reduction of the pay cases must keep union membership separable in
holiday weeks.

=============== FILE: docs/hr-contract-fields.md ===============
# Contract fields in the HR record

`unionMember` exists on the hourly contract type only. The bargaining unit
covered by the works agreement is the hourly workforce; salaried staff sit under
the executive agreement, and the field is not written to their record at all.
The test system builds its contracts from the same record shape, so a salaried
contract cannot be given a union flag to test with.

Export of 2026-09-01:

| contract type | records | carrying unionMember = true | carrying no unionMember field |
|---|---|---|---|
| hourly | 1,412 | 806 | 0 |
| salaried | 370 | 0 | 370 |

=============== FILE: src/weekly-pay.js ===============
'use strict';

const NIGHT_PREMIUM_EUR = 4;

function weeklyTreatment(contract, week) {
  if (contract.salaried) {
    if ('unionMember' in contract) {
      throw new Error('unionMember is not a field on a salaried contract');
    }
    const accruals = [];
    if (week.hoursOver40 > 0) accruals.push('time-off-in-lieu-1x');
    if (week.publicHolidayWorked) accruals.push('day-in-lieu');
    return { basis: 'salaried', overtimeRate: null, holidayRate: null, nightPremiumEurPerHour: 0, accruals };
  }
  return {
    basis: 'hourly',
    overtimeRate: week.hoursOver40 > 0 ? 1.5 : null,
    holidayRate: week.publicHolidayWorked ? (contract.unionMember ? 2.5 : 2.0) : null,
    nightPremiumEurPerHour: week.nightShift ? NIGHT_PREMIUM_EUR : 0,
    accruals: [],
  };
}

module.exports = { weeklyTreatment, NIGHT_PREMIUM_EUR };

=============== FILE: test/weekly-pay.test.js ===============
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
