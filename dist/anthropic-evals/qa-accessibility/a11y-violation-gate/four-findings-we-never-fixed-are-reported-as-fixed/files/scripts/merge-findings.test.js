'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonical, fingerprint, readAxe } = require('./merge-findings');

test('the two tools name the same contrast rule differently', () => {
  assert.equal(canonical('WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'), 'color-contrast');
  assert.equal(canonical('color-contrast'), 'color-contrast');
});

test('a finding is identified by tool, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'link-name', page_url: '/checkout', selector: 'a.icon-cart' }),
    'axe::link-name::/checkout::a.icon-cart',
  );
});

test('the axe report flattens to one record per offending element', () => {
  assert.equal(readAxe().length, 7);
});
