import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPlatform, countsByPlatform } from './platform-split.mjs';

const PATHS = [
  'tests/a.spec.ts-snapshots/one-1-chromium-darwin.png',
  'tests/a.spec.ts-snapshots/one-1-chromium-linux.png',
  'tests/a.spec.ts-snapshots/two-1-firefox-linux.png',
  'tests/a.spec.ts-snapshots/legacy.png',
];

test('splits on the platform segment', () => {
  const split = splitByPlatform(PATHS);
  assert.equal(split.darwin.length, 1);
  assert.equal(split.linux.length, 2);
});

test('keeps names it cannot parse', () => {
  assert.equal(splitByPlatform(PATHS).unrecognized.length, 1);
});

test('counts every bucket', () => {
  assert.deepEqual(countsByPlatform(PATHS), {
    darwin: 1,
    linux: 2,
    win32: 0,
    unrecognized: 1,
  });
});
