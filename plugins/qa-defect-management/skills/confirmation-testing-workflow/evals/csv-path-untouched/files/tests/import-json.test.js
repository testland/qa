'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { importJson } = require('../src/importer');

test('BUG-4471: postal codes keep their leading zero', () => {
  const rows = [{ id: 'c_1', postal_code: '01234', city: 'Springfield' }];
  assert.deepEqual(importJson(rows), [
    { id: 'c_1', postalCode: '01234', city: 'Springfield' },
  ]);
});
