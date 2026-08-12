# Delete-document authorization paths are untested

## Problem Description

`src/deleteDocument.js` handles `DELETE /documents/:id`. It distinguishes
several refusal reasons deliberately: who you are, what you are allowed to
do, whether the document exists as far as you are concerned, and whether it
is currently locked.

A recent refactor briefly returned the same status for two different refusal
reasons and no test caught it. Only the success path is covered today.

## Output Specification

Add `src/deleteDocument.test.js` covering the refusal paths, keeping each
refusal reason distinguishable from the others.

Run `npm test` before you finish; it must pass.

Leave `src/deleteDocument.happy.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "docs-api",
  "version": "5.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/deleteDocument.js ===============
'use strict';

const SESSIONS = {
  'tok-owner': { userId: 'u_owner', workspaceId: 'w_1', role: 'editor', expired: false },
  'tok-viewer': { userId: 'u_viewer', workspaceId: 'w_1', role: 'viewer', expired: false },
  'tok-other': { userId: 'u_other', workspaceId: 'w_2', role: 'editor', expired: false },
  'tok-stale': { userId: 'u_owner', workspaceId: 'w_1', role: 'editor', expired: true },
};

const DOCUMENTS = {
  doc_1: { id: 'doc_1', workspaceId: 'w_1', ownerId: 'u_owner', locked: false },
  doc_2: { id: 'doc_2', workspaceId: 'w_1', ownerId: 'u_owner', locked: true },
};

function deleteDocument(token, documentId) {
  const session = SESSIONS[token];
  if (!session) {
    return { status: 401, code: 'MISSING_OR_UNKNOWN_TOKEN' };
  }
  if (session.expired) {
    return { status: 401, code: 'TOKEN_EXPIRED' };
  }

  const document = DOCUMENTS[documentId];
  if (!document || document.workspaceId !== session.workspaceId) {
    return { status: 404, code: 'NOT_FOUND' };
  }
  if (session.role !== 'editor') {
    return { status: 403, code: 'INSUFFICIENT_ROLE' };
  }
  if (document.locked) {
    return { status: 409, code: 'LOCKED' };
  }
  return { status: 204, code: null };
}

module.exports = { deleteDocument };

=============== FILE: src/deleteDocument.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deleteDocument } = require('./deleteDocument');

test('an editor deletes their own unlocked document', () => {
  assert.deepEqual(deleteDocument('tok-owner', 'doc_1'), { status: 204, code: null });
});
