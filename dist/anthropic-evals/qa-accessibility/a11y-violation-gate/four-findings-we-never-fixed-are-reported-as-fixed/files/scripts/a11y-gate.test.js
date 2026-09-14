'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonical, collect, classify } = require('./a11y-gate');

test('the two tools name the same contrast rule differently', () => {
  assert.equal(canonical('WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'), 'color-contrast');
  assert.equal(canonical('color-contrast'), 'color-contrast');
});

test('both reports flatten to one record per offending element', () => {
  assert.equal(collect().length, 6);
});

test('a finding already on the list is grandfathered, not re-reported', () => {
  const result = classify(
    [
      { fingerprint: 'x::already-known', severity: 'serious' },
      { fingerprint: 'x::brand-new', severity: 'critical' },
    ],
    ['x::already-known'],
    { blockOn: ['critical', 'serious'], warnOn: ['moderate'] },
  );
  assert.equal(result.grandfathered, 1);
  assert.deepEqual(result.blockers.map((r) => r.fingerprint), ['x::brand-new']);
});
