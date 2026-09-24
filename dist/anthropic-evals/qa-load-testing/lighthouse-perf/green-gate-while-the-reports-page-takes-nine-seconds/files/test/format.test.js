import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatMs } from '../src/format.js';

test('bytes below a kilobyte stay in bytes', () => {
  assert.equal(formatBytes(512), '512 B');
});

test('bytes scale to kB and MB', () => {
  assert.equal(formatBytes(1536), '1.5 kB');
  assert.equal(formatBytes(1048576), '1.0 MB');
});

test('milliseconds become seconds above a thousand', () => {
  assert.equal(formatMs(880), '880 ms');
  assert.equal(formatMs(9140), '9.14 s');
});

test('negative input is rejected', () => {
  assert.throws(() => formatBytes(-1), RangeError);
  assert.throws(() => formatMs(-1), RangeError);
});
