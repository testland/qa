'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isNight } = require('../src/digest');

test('night starts at 22:00', () => {
  assert.equal(isNight(21), false);
  assert.equal(isNight(22), true);
});

test('night ends at 07:00', () => {
  assert.equal(isNight(6), true);
  assert.equal(isNight(7), false);
});
