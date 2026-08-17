'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleCreateProject } = require('./createProject');

test('creates a project', () => {
  const response = handleCreateProject({
    headers: { authorization: 'Bearer valid-token' },
    body: { name: 'Apollo', ownerId: 'u_1' },
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.name, 'Apollo');
});
