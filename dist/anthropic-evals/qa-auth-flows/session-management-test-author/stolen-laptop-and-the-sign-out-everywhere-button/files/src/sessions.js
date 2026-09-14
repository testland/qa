'use strict';

const crypto = require('node:crypto');

function createSessions() {
  const store = new Map();

  function login(user, device) {
    const sid = crypto.randomBytes(16).toString('hex');
    store.set(sid, { user, device, createdAt: Date.now() });
    return sid;
  }

  // What every authenticated page calls.
  function request(sid) {
    return store.has(sid) ? 200 : 401;
  }

  // "Sign out" in the header menu.
  function logout(sid) {
    if (!store.has(sid)) return { status: 401, headers: {} };
    return {
      status: 200,
      headers: { 'set-cookie': ['sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'] },
      body: { ok: true },
    };
  }

  // "Sign out everywhere" on the account security page.
  function logoutAll(sid) {
    const current = store.get(sid);
    if (!current) return { status: 401, headers: {} };

    for (const [id, session] of store) {
      if (session.user === current.user && session.device === current.device) {
        store.delete(id);
      }
    }

    return {
      status: 200,
      headers: { 'set-cookie': ['sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'] },
      body: { ok: true },
    };
  }

  return { login, request, logout, logoutAll, count: () => store.size };
}

module.exports = { createSessions };
