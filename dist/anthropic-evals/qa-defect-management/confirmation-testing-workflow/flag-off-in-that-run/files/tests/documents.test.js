'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { saveDocument } = require('../src/documents');

function store() {
  return { doc_1: { id: 'doc_1', body: 'original', version: 3 } };
}

test('a stale save is rejected', () => {
  const s = store();
  assert.deepEqual(saveDocument(s, 'dev', { id: 'doc_1', body: 'A', baseVersion: 3 }), {
    status: 200,
    version: 4,
  });
  assert.deepEqual(saveDocument(s, 'dev', { id: 'doc_1', body: 'B', baseVersion: 3 }), {
    status: 409,
    code: 'STALE_VERSION',
    currentVersion: 4,
  });
  assert.equal(s.doc_1.body, 'A');
});
