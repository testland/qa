'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/reading-time.js');

test('a typical chapter rounds to whole minutes', () => {
  assert.equal(readingTimeMinutes(2380), 10);
});

test('a very short text still reads as one minute', () => {
  assert.equal(readingTimeMinutes(12), 1);
});

test('zero words is one minute, not zero', () => {
  assert.equal(readingTimeMinutes(0), 1);
});

test('a non-integer word count throws', () => {
  assert.throws(() => readingTimeMinutes(12.5), RangeError);
});
