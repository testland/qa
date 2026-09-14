'use strict';

const crypto = require('node:crypto');

function createSessionStore() {
  const sessions = new Map();

  function newId() {
    return crypto.randomBytes(16).toString('hex');
  }

  function create(id) {
    const sid = id || newId();
    const session = { id: sid, user: null, createdAt: Date.now() };
    sessions.set(sid, session);
    return session;
  }

  // Issues a fresh id for an existing session. The previous row is kept so a
  // request already in flight on the old id does not 401 mid-page.
  function regenerate(id) {
    const previous = sessions.get(id) || { user: null };
    const sid = newId();
    sessions.set(sid, { ...previous, id: sid, createdAt: Date.now() });
    return sessions.get(sid);
  }

  function get(id) {
    return sessions.get(id);
  }

  function destroy(id) {
    sessions.delete(id);
  }

  return { create, regenerate, get, destroy, count: () => sessions.size };
}

module.exports = { createSessionStore };
