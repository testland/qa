# Async memo: properties over generated keys

## Problem Description

`src/asyncMemo.js` wraps an async loader so concurrent callers for the same
key share one in-flight load, and later callers get the cached value.

The existing test uses the key `"a"`. We would like the invariants stated
over arbitrary keys and arbitrary call patterns instead, because the bug we
shipped last quarter only appeared for keys that collided with an inherited
Object property name.

## Output Specification

Add `src/asyncMemo.property.test.js` stating, over generated input, that the
loader runs once per distinct key however many callers arrive, and that every
caller receives the same value.

Leave `src/asyncMemo.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "async-memo",
  "version": "1.0.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "fast-check": "^3.19.0"
  }
}

=============== FILE: src/asyncMemo.js ===============
'use strict';

function createAsyncMemo(loader) {
  const settled = new Map();
  const inFlight = new Map();

  return async function memo(key) {
    if (settled.has(key)) {
      return settled.get(key);
    }
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }
    const promise = Promise.resolve(loader(key)).then((value) => {
      settled.set(key, value);
      inFlight.delete(key);
      return value;
    });
    inFlight.set(key, promise);
    return promise;
  };
}

module.exports = { createAsyncMemo };

=============== FILE: src/asyncMemo.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAsyncMemo } = require('./asyncMemo');

test('loads once for repeated calls', async () => {
  let calls = 0;
  const memo = createAsyncMemo(async (key) => {
    calls += 1;
    return `${key}!`;
  });

  const [first, second] = await Promise.all([memo('a'), memo('a')]);

  assert.equal(first, 'a!');
  assert.equal(second, 'a!');
  assert.equal(calls, 1);
});
