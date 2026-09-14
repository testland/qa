'use strict';

const crypto = require('node:crypto');

function createSessions({ clock, config }) {
  const store = new Map();

  function login(user) {
    const sid = crypto.randomBytes(16).toString('hex');
    store.set(sid, { user, lastSeenAt: clock.now() });
    return sid;
  }

  // The Set-Cookie the login response carries.
  function cookieFor(sid) {
    const maxAge = config.cookieMaxAgeHours * 60 * 60;
    return `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
  }

  // Returns the session if it is still usable, else null.
  function resolve(sid) {
    const session = store.get(sid);
    if (!session) return null;

    const idleMs = config.idleMinutes * 60 * 1000;
    if (clock.now() - session.lastSeenAt > idleMs) {
      store.delete(sid);
      return null;
    }

    if (config.rolling) session.lastSeenAt = clock.now();
    return session;
  }

  // What the record pages call on every hit.
  function request(sid) {
    return resolve(sid) ? 200 : 401;
  }

  function logout(sid) {
    store.delete(sid);
  }

  return { login, cookieFor, resolve, request, logout, count: () => store.size };
}

module.exports = { createSessions };
