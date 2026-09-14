import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNameStatus, groupBySpecDir } from './baseline-paths.mjs';

const SAMPLE = [
  'M\ttests/a.spec.ts-snapshots/one-1-chromium-linux.png',
  'A\ttests/a.spec.ts-snapshots/two-1-firefox-linux.png',
  'M\ttests/b.spec.ts-snapshots/three-1-chromium-linux.png',
  'M\tsrc/tokens.css',
].join('\n');

test('parses only png rows', () => {
  const entries = parseNameStatus(SAMPLE);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].status, 'M');
});

test('groups by spec directory', () => {
  const grouped = groupBySpecDir(parseNameStatus(SAMPLE));
  assert.equal(grouped.size, 2);
  assert.equal(grouped.get('tests/a.spec.ts-snapshots').length, 2);
});
