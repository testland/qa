'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

test('the signed snapshot parses as an array of findings', () => {
  const report = JSON.parse(fs.readFileSync('.secrets/scan-2026-09-10.json', 'utf8'));
  assert.ok(Array.isArray(report));
  assert.ok(report.length > 0);
});

test('every finding carries the fields the evidence pack cites', () => {
  const report = JSON.parse(fs.readFileSync('.secrets/scan-2026-09-10.json', 'utf8'));
  for (const f of report) {
    for (const key of ['RuleID', 'File', 'StartLine', 'Commit', 'Fingerprint']) {
      assert.ok(Object.hasOwn(f, key), 'finding missing ' + key + ': ' + JSON.stringify(f.File));
    }
  }
});

test('the SDK fixture parses and declares the harness fields', () => {
  const j = JSON.parse(fs.readFileSync('tests/fixtures/sdk-checkout.json', 'utf8'));
  for (const key of ['stripeKey', 'amountMinor', 'currency']) {
    assert.ok(Object.hasOwn(j, key), 'fixture missing ' + key);
  }
});
