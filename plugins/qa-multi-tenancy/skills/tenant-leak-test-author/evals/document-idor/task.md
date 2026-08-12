# Document access is only tested from inside one tenant

## Problem Description

`src/documentAccess.js` scopes every document operation to the caller's
tenant. The whole suite runs as a single tenant, so every test passes whether
or not the scoping works - remove the tenant filter and nothing fails.

We need coverage that actually attempts access across the boundary.

## Output Specification

Add `src/documentAccess.test.js` covering cross-tenant access attempts
against each operation this module exposes: read, list, update and delete.

Run `npm test` before you finish; it must pass.

Leave `src/documentAccess.single.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "workspace-docs",
  "version": "1.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/documentAccess.js ===============
'use strict';

function createRepository(seed) {
  const documents = new Map(seed.map((doc) => [doc.id, { ...doc }]));

  function visible(session, id) {
    const doc = documents.get(id);
    if (!doc || doc.tenantId !== session.tenantId) {
      return null;
    }
    return doc;
  }

  return {
    list(session) {
      return [...documents.values()].filter((doc) => doc.tenantId === session.tenantId);
    },
    read(session, id) {
      const doc = visible(session, id);
      return doc ? { status: 'ok', document: doc } : { status: 'not_found', document: null };
    },
    update(session, id, patch) {
      const doc = visible(session, id);
      if (!doc) {
        return { status: 'not_found' };
      }
      Object.assign(doc, patch);
      return { status: 'ok', document: doc };
    },
    remove(session, id) {
      const doc = visible(session, id);
      if (!doc) {
        return { status: 'not_found' };
      }
      documents.delete(id);
      return { status: 'ok' };
    },
    countAll() {
      return documents.size;
    },
    rawGet(id) {
      return documents.get(id) || null;
    },
  };
}

module.exports = { createRepository };

=============== FILE: src/documentAccess.single.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('./documentAccess');

const SESSION = { userId: 'u_1', tenantId: 't_acme' };

test('a tenant reads its own document', () => {
  const repo = createRepository([
    { id: 'doc_1', tenantId: 't_acme', title: 'Roadmap' },
  ]);

  assert.equal(repo.read(SESSION, 'doc_1').status, 'ok');
  assert.equal(repo.list(SESSION).length, 1);
});
