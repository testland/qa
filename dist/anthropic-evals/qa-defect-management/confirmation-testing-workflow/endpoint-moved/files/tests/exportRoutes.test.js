'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { postWorkspaceExport } = require('../src/exportRoutes');
const { WORKSPACES } = require('../src/store');

test('csv export of a workspace with projects', () => {
  const res = postWorkspaceExport('w_2', { format: 'csv' }, WORKSPACES);
  assert.equal(res.status, 200);
  assert.equal(res.body.rowCount, 2);
  assert.equal(res.body.body, 'id,name\np_1,Alpha\np_2,Beta');
});
