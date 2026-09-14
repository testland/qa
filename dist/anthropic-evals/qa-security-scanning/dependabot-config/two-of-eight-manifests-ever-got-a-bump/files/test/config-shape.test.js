const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const CONFIG = '.github/dependabot.yml';
const read = () => fs.readFileSync(CONFIG, 'utf8');
const blocks = () => read().split(/^\s*-\s+package-ecosystem:/m).slice(1);

test('declares schema version 2', () => {
  assert.match(read(), /^version:\s*2\s*$/m);
});

test('no tab characters (YAML forbids tab indentation)', () => {
  assert.ok(!read().includes('\t'), 'file contains a tab character');
});

test('at least one update block', () => {
  assert.ok(blocks().length > 0, 'no update blocks found');
});

test('every update block declares a schedule interval', () => {
  for (const b of blocks()) assert.match(b, /\n\s+interval:\s*"?[a-z]+"?/);
});

test('every update block declares directory or directories', () => {
  for (const b of blocks()) assert.match(b, /\n\s+director(y|ies):/);
});
