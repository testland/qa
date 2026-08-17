'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDirectory, importMembers } = require('./importMembers');

test('imports a whole batch', () => {
  const directory = createDirectory();
  const result = importMembers(directory, [
    { email: 'ada@example.com', role: 'admin' },
    { email: 'grace@example.com', role: 'member' },
  ]);
  assert.equal(result.status, 201);
  assert.equal(result.imported, 2);
  assert.equal(directory.members.size, 2);
  assert.equal(directory.audit.length, 2);
});
