# CSV escaping is tested with the six strings someone thought of

## Problem Description

`src/csvField.js` escapes a value for a CSV cell and parses it back. The
existing test covers a handful of hand-picked strings - a comma, a quote, a
newline - and passes.

We keep finding inputs it does not handle. The last one was a value that was
entirely whitespace; before that, a value containing a quote at the very end.
Picking more examples by hand has not been working.

## Output Specification

Add `src/csvField.property.test.js` asserting the round-trip relationship
between `formatField` and `parseField` holds for arbitrary string input, plus
the other structural relationships this pair should satisfy.

Leave `src/csvField.examples.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "csv-tools",
  "version": "0.4.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "fast-check": "^3.19.0"
  }
}

=============== FILE: src/csvField.js ===============
'use strict';

const NEEDS_QUOTING = /[",\r\n]/;

function formatField(value) {
  if (typeof value !== 'string') {
    throw new TypeError('formatField expects a string');
  }
  if (!NEEDS_QUOTING.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function parseField(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseField expects a string');
  }
  if (!text.startsWith('"')) {
    return text;
  }
  return text.slice(1, -1).replace(/""/g, '"');
}

module.exports = { formatField, parseField };

=============== FILE: src/csvField.examples.test.js ===============
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
