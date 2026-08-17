'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deleteDocument } = require('./deleteDocument');

test('an editor deletes their own unlocked document', () => {
  assert.deepEqual(deleteDocument('tok-owner', 'doc_1'), { status: 204, code: null });
});
