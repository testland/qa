'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAvatar } = require('./avatar');

test('accepts an ordinary avatar', () => {
  assert.deepEqual(validateAvatar(64 * 1024), { ok: true, code: null });
});
