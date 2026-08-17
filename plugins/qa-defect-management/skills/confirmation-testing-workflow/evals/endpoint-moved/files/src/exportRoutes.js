'use strict';

const { buildExport } = require('./exportJob');

function postWorkspaceExport(workspaceId, body, store) {
  const workspace = store[workspaceId];
  if (!workspace) {
    return { status: 404, body: { code: 'NOT_FOUND' } };
  }
  const format = body.format || 'json';
  return { status: 200, body: buildExport(workspace, format) };
}

module.exports = { postWorkspaceExport };
