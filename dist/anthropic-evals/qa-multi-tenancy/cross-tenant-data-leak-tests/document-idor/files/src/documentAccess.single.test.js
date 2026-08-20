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
