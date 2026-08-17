'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatField, parseField } = require('./csvField');

test('plain values pass through', () => {
  assert.equal(formatField('hello'), 'hello');
  assert.equal(parseField('hello'), 'hello');
});

test('commas are quoted', () => {
  assert.equal(formatField('a,b'), '"a,b"');
  assert.equal(parseField('"a,b"'), 'a,b');
});

test('quotes are doubled', () => {
  assert.equal(formatField('say "hi"'), '"say ""hi"""');
  assert.equal(parseField('"say ""hi"""'), 'say "hi"');
});
