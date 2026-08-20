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
