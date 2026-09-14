'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, loadScan, evaluate } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'region', page_url: '/dashboard', selector: 'body' }),
    'axe::region::/dashboard::body',
  );
});

test('this morning scan carries six findings', () => {
  assert.equal(loadScan('reports/latest-scan.json').length, 6);
});

test('a listed finding is grandfathered and an unlisted serious one blocks', () => {
  const records = [
    { fingerprint: 'axe::region::/dashboard::body', severity: 'moderate' },
    { fingerprint: 'axe::color-contrast::/new::span.x', severity: 'serious' },
  ];
  const r = evaluate(records, ['axe::region::/dashboard::body']);
  assert.equal(r.grandfathered, 1);
  assert.equal(r.blockers.length, 1);
  assert.equal(r.fixed.length, 0);
});
