# Bulk member import: a rejected batch used to leave half the rows behind

## Problem Description

`src/importMembers.js` is the handler behind `POST /directories/:id/members:import`.
It takes a batch of rows and either applies all of them or applies none.

Two releases ago it applied rows as it walked the batch, so a bad row at
position 9 left rows 0 to 8 in the directory and 9 lines in the audit log. An
admin then re-sent the corrected batch and got a duplicate-email refusal for
rows that were never supposed to exist. The handler was rewritten to stage the
batch first; the current file is that rewrite.

The only test is the success case. Nothing in the suite would notice if the
staging step were dropped again - the refusal status would still be the same,
and that is all anyone checks today.

## Output Specification

1. Add `src/importMembers.test.js` covering the refusal paths this handler
   implements.
2. A refusal that returned the right status while still writing rows, audit
   lines, or id sequence numbers must fail the suite.
3. Do not modify `src/importMembers.js`; its current behaviour is the
   specification.
4. Leave `src/importMembers.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "directory-service",
  "version": "2.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/importMembers.js ===============
'use strict';

const ROLES = ['owner', 'admin', 'member'];
const MAX_BATCH = 50;

function createDirectory() {
  return { members: new Map(), audit: [], seq: 0 };
}

function importMembers(directory, batch) {
  if (!Array.isArray(batch)) {
    return { status: 400, code: 'BATCH_NOT_A_LIST', index: null, imported: 0 };
  }
  if (batch.length === 0) {
    return { status: 400, code: 'BATCH_EMPTY', index: null, imported: 0 };
  }
  if (batch.length > MAX_BATCH) {
    return { status: 422, code: 'BATCH_TOO_LARGE', index: null, imported: 0 };
  }

  const staged = [];
  for (let index = 0; index < batch.length; index += 1) {
    const row = batch[index];
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      return { status: 400, code: 'ROW_MALFORMED', index, imported: 0 };
    }
    if (typeof row.email !== 'string' || !row.email.includes('@')) {
      return { status: 400, code: 'EMAIL_INVALID', index, imported: 0 };
    }
    if (!ROLES.includes(row.role)) {
      return { status: 400, code: 'ROLE_UNSUPPORTED', index, imported: 0 };
    }
    if (directory.members.has(row.email) || staged.some((s) => s.email === row.email)) {
      return { status: 409, code: 'EMAIL_DUPLICATE', index, imported: 0 };
    }
    staged.push({ email: row.email, role: row.role });
  }

  for (const row of staged) {
    directory.seq += 1;
    directory.members.set(row.email, {
      id: `m_${directory.seq}`,
      email: row.email,
      role: row.role,
    });
    directory.audit.push({ action: 'member.imported', email: row.email });
  }
  return { status: 201, code: null, index: null, imported: staged.length };
}

module.exports = { createDirectory, importMembers, ROLES, MAX_BATCH };

=============== FILE: src/importMembers.happy.test.js ===============
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
