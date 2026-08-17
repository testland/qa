'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUsername } = require('./username');

test('accepts a normal username', () => {
  assert.equal(validateUsername('ada_lovelace').ok, true);
});

test('rejects an obviously bad username', () => {
  assert.equal(validateUsername('!!').ok, false);
});
