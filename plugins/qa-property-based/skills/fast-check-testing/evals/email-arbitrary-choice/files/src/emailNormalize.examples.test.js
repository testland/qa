'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail } = require('./emailNormalize');

test('lower-cases the domain', () => {
  assert.equal(normalizeEmail('Ada@Example.COM'), 'Ada@example.com');
});

test('trims surrounding whitespace', () => {
  assert.equal(normalizeEmail('  ada@example.com  '), 'ada@example.com');
});
