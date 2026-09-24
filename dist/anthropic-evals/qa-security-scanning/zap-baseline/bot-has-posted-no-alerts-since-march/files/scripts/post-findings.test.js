'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collect, comment } = require('./post-findings');

test('alerts are flattened out of the report', () => {
  const alerts = collect('fixtures/sample-report.json');
  assert.equal(alerts.length, 2);
  assert.deepEqual(alerts.map((a) => a.rule_id), ['10049', '10063']);
  assert.equal(alerts[0].risk, 'Low');
  assert.equal(alerts[1].url, 'https://pr-1.atlas-review.dev/');
});

test('the comment lists every alert it was given', () => {
  const body = comment([
    { rule_id: '10038', name: 'Content Security Policy Header Not Set', risk: 'Medium', url: '/' },
  ]);
  assert.match(body, /1 alert/);
  assert.match(body, /10038/);
});

test('an empty list produces the nothing-to-review comment', () => {
  assert.match(comment([]), /Nothing to review/);
});
