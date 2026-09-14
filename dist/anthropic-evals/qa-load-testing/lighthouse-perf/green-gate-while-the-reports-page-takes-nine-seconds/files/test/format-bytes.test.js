'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBytes } = require('../src/format-bytes.js');

test('bytes below a thousand stay bytes', () => {
  assert.equal(formatBytes(512), '512 B');
});

test('a megabyte rounds to one decimal', () => {
  assert.equal(formatBytes(1341020), '1.3 MB');
});

test('exact thousand promotes a unit', () => {
  assert.equal(formatBytes(1000), '1 kB');
});

test('negative input throws', () => {
  assert.throws(() => formatBytes(-1), RangeError);
});
