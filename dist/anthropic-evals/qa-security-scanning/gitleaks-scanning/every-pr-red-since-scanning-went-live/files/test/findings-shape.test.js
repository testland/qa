'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const findings = JSON.parse(fs.readFileSync('.secrets/findings-excerpt.json', 'utf8'));

test('the excerpt is a non-empty array of findings', () => {
  assert.ok(Array.isArray(findings));
  assert.ok(findings.length > 0);
});

test('every finding carries the fields the burn-down tooling reads', () => {
  for (const f of findings) {
    for (const key of ['RuleID', 'File', 'Commit', 'Date', 'Fingerprint']) {
      assert.ok(Object.hasOwn(f, key), 'finding missing ' + key + ': ' + JSON.stringify(f.File));
    }
    assert.ok(!Number.isNaN(Date.parse(f.Date)), 'unparseable Date on ' + f.File);
  }
});

test('fingerprints are unique', () => {
  const fps = findings.map((f) => f.Fingerprint);
  assert.strictEqual(new Set(fps).size, fps.length);
});
