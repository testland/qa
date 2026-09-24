'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tokenize } = require('../src/ranking');

test('tokenize lowercases and splits on punctuation', () => {
  assert.deepEqual(tokenize('Red Shoes, size 10!'), ['red', 'shoes', 'size', '10']);
});

test('tokenize drops empty fragments', () => {
  assert.deepEqual(tokenize('  --  '), []);
});
