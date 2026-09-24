'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, readRecords, classify } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'region', page_url: '/docs', selector: 'body' }),
    'axe::region::/docs::body',
  );
});

test('the 5210 scan flattens to one record per offending element', () => {
  assert.equal(readRecords('reports/pr-5210-scan.json').length, 10);
});

test('a finding already on the known list is grandfathered, not re-reported', () => {
  const records = [
    { fingerprint: 'axe::color-contrast::/docs::code.inline', severity: 'serious' },
    { fingerprint: 'axe::label::/::input#brand-new', severity: 'critical' },
  ];
  const result = classify(records, ['axe::color-contrast::/docs::code.inline'], {
    blockOn: ['critical'],
    warnOn: ['moderate'],
  });
  assert.equal(result.grandfathered, 1);
  assert.deepEqual(result.blockers.map((r) => r.fingerprint), ['axe::label::/::input#brand-new']);
});
