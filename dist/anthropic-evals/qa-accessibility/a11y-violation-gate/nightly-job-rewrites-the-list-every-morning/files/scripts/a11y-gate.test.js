'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, readRecords, evaluate } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'label', page_url: '/careers', selector: 'input#resume' }),
    'axe::label::/careers::input#resume',
  );
});

test('this morning scan flattens to one record per offending element', () => {
  assert.equal(readRecords('reports/latest-scan.json').length, 19);
});

test('a listed finding is grandfathered and an unlisted serious one blocks', () => {
  const records = [
    { fingerprint: 'axe::color-contrast::/::a.nav-cta', severity: 'serious' },
    { fingerprint: 'axe::color-contrast::/::span.new', severity: 'serious' },
  ];
  const result = evaluate(records, ['axe::color-contrast::/::a.nav-cta']);
  assert.equal(result.grandfathered, 1);
  assert.equal(result.blockers.length, 1);
  assert.equal(result.blockers[0].fingerprint, 'axe::color-contrast::/::span.new');
});
