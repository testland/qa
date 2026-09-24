import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTokenFiles } from '../scripts/build-tokens.mjs';

test('merges declarations from every source file', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --b: red; }']);
  assert.match(out, /--a: 1px;/);
  assert.match(out, /--b: red;/);
});

test('later files win on a repeated name', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --a: 2px; }']);
  assert.match(out, /--a: 2px;/);
  assert.doesNotMatch(out, /--a: 1px;/);
});

test('emits a single root block', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --b: red; }']);
  assert.equal(out.match(/:root/g).length, 1);
});
