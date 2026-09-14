'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, readRecords, classify } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'label', page_url: '/checkout', selector: 'input#coupon' }),
    'axe::label::/checkout::input#coupon',
  );
});

test('the scan flattens to one record per offending element', () => {
  assert.equal(readRecords('reports/scan-9412.json').length, 8);
});

test('a finding already on the list is grandfathered, not re-reported', () => {
  const result = classify(
    [
      { fingerprint: 'axe::color-contrast::/checkout::a.promo-terms', severity: 'serious' },
      { fingerprint: 'axe::aria-required-attr::/account::div[role="dialog"]', severity: 'critical' },
    ],
    ['axe::color-contrast::/checkout::a.promo-terms'],
    { blockOn: ['critical', 'serious'], warnOn: ['moderate'] },
  );
  assert.equal(result.grandfathered, 1);
  assert.deepEqual(result.blockers.map((r) => r.fingerprint), [
    'axe::aria-required-attr::/account::div[role="dialog"]',
  ]);
});
