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
