'use strict';

const crypto = require('node:crypto');

function createApp() {
  const sessions = new Map();

  const keys = new Map([
    ['k_8812', { owner: 'w.mbeki', revoked: false }],
    ['k_9043', { owner: 'w.mbeki', revoked: false }],
    ['k_5510', { owner: 't.harlow', revoked: false }],
  ]);

  const accounts = new Map([
    ['w.mbeki', { plan: 'growth', webhook: null }],
    ['t.harlow', { plan: 'starter', webhook: null }],
  ]);

  function login(user) {
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, { user, csrfToken: crypto.randomBytes(16).toString('hex') });
    return sid;
  }

  function csrfTokenFor(sid) {
    return sessions.get(sid).csrfToken;
  }

  // Shared anti-forgery check. Both write endpoints go through this.
  function tokenOk(session, headers) {
    const supplied = headers['x-csrf-token'];
    if (typeof supplied !== 'string') return false;
    if (supplied.length !== session.csrfToken.length) return false;
    return true;
  }

  function handle({ method, path, query = {}, headers = {}, cookies = {} }) {
    const session = sessions.get(cookies.sid);
    if (!session) return { status: 401, body: { error: 'unauthenticated' } };

    if (method === 'GET' && path === '/account/keys/revoke') {
      const key = keys.get(query.id);
      if (!key || key.owner !== session.user) return { status: 404, body: { error: 'not_found' } };
      key.revoked = true;
      return { status: 200, body: { revoked: query.id } };
    }

    if (method === 'GET' && path === '/account/keys') {
      const mine = [...keys]
        .filter(([, key]) => key.owner === session.user)
        .map(([id, key]) => ({ id, revoked: key.revoked }));
      return { status: 200, body: { keys: mine } };
    }

    if (method === 'GET' && path === '/account/export') {
      return { status: 200, body: { plan: accounts.get(session.user).plan, invoices: [] } };
    }

    if (method === 'GET' && path === '/account/sessions') {
      const mine = [...sessions.values()].filter((s) => s.user === session.user);
      return { status: 200, body: { count: mine.length } };
    }

    if (method === 'POST' && path === '/billing/plan') {
      if (!tokenOk(session, headers)) return { status: 403, body: { error: 'csrf' } };
      accounts.get(session.user).plan = query.plan;
      return { status: 200, body: { plan: query.plan } };
    }

    if (method === 'POST' && path === '/account/webhook') {
      if (!tokenOk(session, headers)) return { status: 403, body: { error: 'csrf' } };
      accounts.get(session.user).webhook = query.url;
      return { status: 200, body: { webhook: query.url } };
    }

    return { status: 404, body: { error: 'not_found' } };
  }

  return {
    login,
    csrfTokenFor,
    handle,
    keyState: (id) => keys.get(id),
    planFor: (user) => accounts.get(user).plan,
    webhookFor: (user) => accounts.get(user).webhook,
  };
}

module.exports = { createApp };
