'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const toml = fs.readFileSync('.gitleaks.toml', 'utf8').replace(/\r/g, '');
const ruleBlocks = toml.split(/^\[\[rules\]\]$/m).slice(1);

test('at least one custom rule is declared', () => {
  assert.ok(ruleBlocks.length > 0, 'no [[rules]] blocks found in .gitleaks.toml');
});

test('every custom rule declares id, description and regex', () => {
  for (const block of ruleBlocks) {
    const head = block.split(/^\[\[/m)[0];
    for (const field of ['id', 'description', 'regex']) {
      assert.match(head, new RegExp('^' + field + '\\s*=', 'm'), 'rule block missing ' + field);
    }
  }
});

test('rule ids are unique', () => {
  const ids = [...toml.matchAll(/^id\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate rule id in ' + ids.join(', '));
});
