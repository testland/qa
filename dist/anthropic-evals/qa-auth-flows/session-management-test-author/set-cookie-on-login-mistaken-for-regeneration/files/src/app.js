'use strict';

const { createSessionStore } = require('./sessionStore');

const USERS = { 'l.whitcombe': 'borrower2024', 'p.nkemdirim': 'fernwood!22' };

function setCookie(sid) {
  return [`sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`];
}

function createApp() {
  const store = createSessionStore();

  // Rewritten 3 March: the login form became a fetch() to POST /login.
  function handle({ method, path, cookies = {}, body = {} }) {
    const supplied = cookies.sid;
    let session = supplied ? store.get(supplied) : undefined;
    if (!session) session = store.create(supplied);

    if (method === 'GET' && path === '/') {
      return {
        status: 200,
        headers: { 'set-cookie': setCookie(session.id) },
        body: { page: 'home' },
      };
    }

    if (method === 'POST' && path === '/login') {
      if (USERS[body.user] !== body.pass) {
        return { status: 401, headers: {}, body: { error: 'bad_credentials' } };
      }
      session.user = body.user;
      return {
        status: 200,
        headers: { 'set-cookie': setCookie(session.id) },
        body: { ok: true, user: body.user },
      };
    }

    if (method === 'GET' && path === '/dashboard') {
      if (!session.user) return { status: 401, headers: {}, body: { error: 'unauthenticated' } };
      return { status: 200, headers: {}, body: { page: 'dashboard', user: session.user } };
    }

    if (method === 'POST' && path === '/account/password') {
      if (!session.user) return { status: 401, headers: {}, body: { error: 'unauthenticated' } };
      USERS[session.user] = body.pass;
      const next = store.regenerate(session.id);
      return {
        status: 200,
        headers: { 'set-cookie': setCookie(next.id) },
        body: { ok: true },
      };
    }

    if (method === 'POST' && path === '/logout') {
      store.destroy(session.id);
      return {
        status: 200,
        headers: { 'set-cookie': ['sid=; Path=/; Max-Age=0'] },
        body: { ok: true },
      };
    }

    return { status: 404, headers: {}, body: { error: 'not_found' } };
  }

  return { handle, store };
}

module.exports = { createApp };
