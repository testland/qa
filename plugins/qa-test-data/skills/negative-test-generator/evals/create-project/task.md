# Create-project handler has only a happy-path test

## Problem Description

`src/createProject.js` is the request handler behind `POST /projects`. It
validates the payload and returns a status plus a structured body.

The only test asserts a valid payload returns 201. Every rejection path the
handler implements is untested, and last month a validator regression turned
a 400 into a 500 without any test noticing.

## Output Specification

Add `src/createProject.test.js` covering the rejection paths this handler
implements, so that a rejection returning the wrong status or the wrong error
shape fails the suite.

Run `npm test` before you finish; it must pass.

Leave `src/createProject.happy.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "projects-service",
  "version": "1.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/createProject.js ===============
'use strict';

const VISIBILITIES = ['private', 'internal', 'public'];
const NAME_MAX = 60;

function handleCreateProject(request) {
  const { headers = {}, body = {} } = request || {};

  if (!headers.authorization) {
    return { status: 401, body: { errors: { auth: 'MISSING_TOKEN' } } };
  }
  if (headers.authorization !== 'Bearer valid-token') {
    return { status: 401, body: { errors: { auth: 'INVALID_TOKEN' } } };
  }

  if (typeof body.name !== 'string') {
    return { status: 400, body: { errors: { name: 'NOT_A_STRING' } } };
  }
  if (body.name.trim() === '') {
    return { status: 400, body: { errors: { name: 'REQUIRED' } } };
  }
  if (body.name.length > NAME_MAX) {
    return { status: 400, body: { errors: { name: 'TOO_LONG' } } };
  }
  if (body.visibility !== undefined && !VISIBILITIES.includes(body.visibility)) {
    return { status: 400, body: { errors: { visibility: 'UNSUPPORTED' } } };
  }
  if (body.ownerId === undefined) {
    return { status: 400, body: { errors: { ownerId: 'REQUIRED' } } };
  }

  return {
    status: 201,
    body: { id: 'proj_1', name: body.name, visibility: body.visibility || 'private' },
  };
}

module.exports = { handleCreateProject, VISIBILITIES, NAME_MAX };

=============== FILE: src/createProject.happy.test.js ===============
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
