# Rate limiter tests fail depending on what ran before them

## Problem Description

`src/rateLimiter.test.js` is red. Each test passes when it is the only one in
the file; together they fail.

Someone has already suggested "just change the expected numbers so they add
up" and someone else suggested merging the tests into one. Neither is what we
want - the tests describe genuinely different situations and should stay
separate and independently meaningful.

## Output Specification

Make the suite pass by removing whatever couples the tests to each other,
keeping each test's assertions describing its own scenario from a clean
starting point. Do not change `src/rateLimiter.js`.

Then produce `isolation-notes.md`: what the tests were sharing, why the
failure moved depending on order, and the rule that keeps this from coming
back as more tests are added to this file.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "gateway",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/rateLimiter.js ===============
'use strict';

const buckets = new Map();

function consume(key, limit) {
  const used = buckets.get(key) || 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0 };
  }
  buckets.set(key, used + 1);
  return { allowed: true, remaining: limit - used - 1 };
}

function usage(key) {
  return buckets.get(key) || 0;
}

function resetAll() {
  buckets.clear();
}

module.exports = { consume, usage, resetAll };

=============== FILE: src/rateLimiter.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { consume, usage } = require('./rateLimiter');

const LIMIT = 3;

test('allows requests up to the limit', () => {
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, true);
  assert.equal(consume('user-a', LIMIT).allowed, false);
});

test('reports remaining allowance on the first request', () => {
  const result = consume('user-a', LIMIT);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
});

test('tracks usage per key', () => {
  consume('user-b', LIMIT);
  assert.equal(usage('user-b'), 1);
  assert.equal(usage('user-a'), 1);
});
