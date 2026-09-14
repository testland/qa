# Signing in on a shared library PC left the account reachable from another machine

## Problem Description

`members-portal` is the account area for a chain of public-library card
holders — loan history, holds, saved address, card renewal. It was
server-rendered until March, when we replaced the login form with a `fetch()`
call to `POST /login` returning JSON. Nothing else in the auth layer was
touched as part of that work.

On 2 September, Fernwood Community College sent us a complaint I cannot
explain. A cardholder signed in at one of their public terminals, `LIB-PC-14`,
used the site for about ten minutes, closed the browser and walked away.
Eleven minutes later somebody on a *different* machine on the college network
was reading her loan history and her saved address. She has not shared her
password and has not changed it since 2024. Their proxy log shows the second
machine never hit `POST /login` at all — the first request it made to us was
`GET /dashboard`, and we answered it with a 200. What the college say about how
those terminals are managed is in the attached notes.

Devon wrote the March rewrite and has already looked at this. His note on the
ticket:

> Not us. I captured a login in devtools and the response carries a
> `Set-Cookie` for `sid`, so the framework is issuing a new session at sign-in
> the way it always did. We also have a test for exactly this case and it has
> been green since the rewrite. Look at the college's proxy — they run a
> caching appliance in front of everything.

Our access logs redact session ids, so the capture in the attached notes shows
the headers but not the values, and I cannot settle it by reading logs. The
repo is attached with the store, the handler and the suite exactly as they
stand. There is a helper in the store for reissuing an id — the password-change
path already uses it and has a green test on it — so if a reissue is what this
needs, that is presumably where you would start.

I have to reply to the college this week. Work out whether `members-portal` is
at fault, and if it is, say precisely what the second person had to do.

## Output Specification

1. Write `src/login-session.test.js`. Do not modify `src/app.test.js` — it is
   the suite Devon is relying on and I want it left as evidence.
2. If the handler or the store is at fault, repair it so your new tests pass.
3. Run `npm test`. The tree you hand back must be green.
4. Write `docs/fernwood-findings.md`: whether the portal is at fault, exactly
   what a second person on that network had to do to reach the account, what
   you changed, and why the existing suite did not catch it.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "members-portal",
  "version": "6.1.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/sessionStore.js ===============
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

=============== FILE: src/app.js ===============
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

=============== FILE: src/app.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');

function sidFrom(response) {
  const header = (response.headers['set-cookie'] || [])[0] || '';
  return header.split(';')[0].split('=')[1];
}

test('the homepage issues a session cookie', () => {
  const app = createApp();
  const res = app.handle({ method: 'GET', path: '/' });
  assert.equal(res.status, 200);
  assert.ok(sidFrom(res));
});

test('the session cookie carries the required attributes', () => {
  const app = createApp();
  const header = app.handle({ method: 'GET', path: '/' }).headers['set-cookie'][0];
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Max-Age=\d+/);
});

test('login issues a session cookie whose id is not the anonymous one', () => {
  const app = createApp();
  const anonymous = app.handle({ method: 'GET', path: '/' });
  const before = sidFrom(anonymous);

  const loggedIn = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'l.whitcombe', pass: 'borrower2024' },
  });
  const after = sidFrom(loggedIn);

  assert.ok(after);
  assert.notEqual(after, before);
});

test('changing the password issues a different session id', () => {
  const app = createApp();
  const loggedIn = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'p.nkemdirim', pass: 'fernwood!22' },
  });
  const sid = sidFrom(loggedIn);

  const changed = app.handle({
    method: 'POST',
    path: '/account/password',
    cookies: { sid },
    body: { pass: 'fernwood!23' },
  });

  assert.equal(changed.status, 200);
  assert.notEqual(sidFrom(changed), sid);
});

test('the dashboard is refused without a signed-in session', () => {
  const app = createApp();
  assert.equal(app.handle({ method: 'GET', path: '/dashboard' }).status, 401);
});

test('bad credentials are refused', () => {
  const app = createApp();
  const res = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'l.whitcombe', pass: 'wrong' },
  });
  assert.equal(res.status, 401);
});

=============== FILE: docs/login-rewrite-notes.md ===============
# March rewrite — notes kept by Devon, plus the devtools capture

The old login was a form POST that re-rendered the page. The new one is:

```js
await fetch('/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ user, pass }),
});
```

Nothing in `src/sessionStore.js` changed. `src/app.js` changed only in the
login branch, which used to render a redirect and now returns JSON.

## Devtools capture, 2 September (values redacted by our logging proxy)

```
GET /
  < 200
  < set-cookie: sid=<redacted>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800

POST /login
  > cookie: sid=<redacted>
  < 200
  < set-cookie: sid=<redacted>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800

GET /dashboard
  > cookie: sid=<redacted>
  < 200
```

Devon's reading of the capture: "there is a `set-cookie` on the login response,
therefore the session is being reissued."

## What the college told us

- The public terminals run under one shared guest OS account. It is signed out
  once, at closing time, and the browser-profile wipe is tied to that sign-out,
  so the profile is not reset between one member and the next.
- `LIB-PC-14` was in continuous use from 13:10 until closing. The cardholder
  sat down at it at 15:41.
- The machine that read the account (`LIB-PC-09`) reached `GET /dashboard`
  first. It made no request to `POST /login` on 2 September at all.
- Both machines were on the same NAT address, `198.51.100.9`.
- Anyone with a library card can use the terminals unsupervised, and the
  browser on every terminal permits the developer tools.
