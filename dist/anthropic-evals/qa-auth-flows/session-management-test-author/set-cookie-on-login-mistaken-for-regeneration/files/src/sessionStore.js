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

  function get(id) {
    return sessions.get(id);
  }

  function destroy(id) {
    sessions.delete(id);
  }

  return { create, get, destroy, count: () => sessions.size };
}

module.exports = { createSessionStore };
