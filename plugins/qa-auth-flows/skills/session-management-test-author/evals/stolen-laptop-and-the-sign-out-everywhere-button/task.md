# The stolen laptop was still reading tickets two days after she pressed Sign out everywhere

## Problem Description

`deskline` is our support-desk product. Agents work a shared queue on a
desktop, which they open through the single sign-on launcher, and carry a
phone app for on-call paging, which they sign in to with a password.

Incident 4471: on 6 September an agent's work laptop was taken from a parked
car at the Bristol depot. She was signed in on it. At 19:05 she signed in on
her phone, opened Account → Security, pressed **Sign out everywhere**, got the
confirmation, and changed her password a minute later. On 8 September our
access log shows the laptop's session — created 4 September, never signed out
by us — pulling the ticket queue and opening four tickets from an address in
Bristol that is neither the depot nor her home. An engineer killed the row by
hand at 15:20.

Deskline holds end-customer addresses and partial card numbers on 1.1 million
tickets, and our contract with Ravensbourne makes an exposure reportable
inside 72 hours, so I need this exact rather than roughly right.

Kieran on platform has put two things on the ticket. The first is that he has
already checked the account-security path and is satisfied it works — he signed
in to his own account in two browsers, pressed the button in one, and the other
stopped working immediately — so his reading is that the laptop was showing a
cached page rather than holding a live session, and that the access log entries
are the queue widget retrying out of the browser cache. The second is his
proposed fix, which is to cap every account to one live session — new sign-in
kills the old one — on the grounds that it closes this whole class of incident
and is about twenty lines. The usage numbers he is proposing that against are
in the attached incident file.

The repo is attached with seven green tests on the session module, including
one that covers the two-device case Kieran describes. Both the account-security
paths are in `src/sessions.js`.

## Output Specification

1. Write `src/logout.test.js`. Do not modify `src/sessions.test.js`.
2. Repair `src/sessions.js` wherever your tests show it does not do what the
   account page tells the agent it is doing.
3. Run `npm test`. The tree you hand back must be green.
4. Write `docs/incident-4471-response.md`: what the laptop session was still
   able to do after 19:05 and why, what you changed, what we have to tell
   Ravensbourne, and a direct answer to each of Kieran's two points.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "deskline",
  "version": "9.3.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/sessions.js ===============
'use strict';

const crypto = require('node:crypto');

function createSessions() {
  const store = new Map();

  // Password sign-in: the phone app, and the sign-in form on the web header.
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
      if (session.user === current.user) {
        store.delete(id);
      }
    }

    return {
      status: 200,
      headers: { 'set-cookie': ['sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'] },
      body: { ok: true },
    };
  }

  // Desktop launcher. The identity provider hands back the subject it knows
  // the agent by, which is what we record for the row.
  function loginSso(subject, device) {
    const sid = crypto.randomBytes(16).toString('hex');
    store.set(sid, { subject, device, via: 'sso', createdAt: Date.now() });
    return sid;
  }

  return { login, loginSso, request, logout, logoutAll, count: () => store.size };
}

module.exports = { createSessions };

=============== FILE: src/sessions.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessions } = require('./sessions');

test('signing in gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.request(sid), 200);
});

test('the desktop launcher gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.loginSso('r.adeyemi', 'laptop-7');
  assert.equal(sessions.request(sid), 200);
});

test('an unknown session id is refused', () => {
  const sessions = createSessions();
  assert.equal(sessions.request('not-a-real-session'), 401);
});

test('signing out clears the session cookie', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  const res = sessions.logout(sid);
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /Max-Age=0/);
});

test('sign out everywhere is refused for an unknown session', () => {
  const sessions = createSessions();
  assert.equal(sessions.logoutAll('not-a-real-session').status, 401);
});

test('sign out everywhere ends the session it was pressed on', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.logoutAll(sid).status, 200);
  assert.equal(sessions.request(sid), 401);
});

test('sign out everywhere ends the agent second device too', () => {
  const sessions = createSessions();
  const phone = sessions.login('r.adeyemi', 'pixel-r');
  const desk = sessions.login('r.adeyemi', 'desk-12');
  sessions.logoutAll(phone);
  assert.equal(sessions.request(desk), 401);
});

=============== FILE: docs/incident-4471.md ===============
# Incident 4471 — laptop taken, Bristol depot

## Timeline

| When | What |
|---|---|
| 4 Sep 08:12 | `r.adeyemi` opens the desktop launcher on `laptop-7` and is signed in through it. Session row `9f2c...` created. |
| 6 Sep 18:40 | Laptop taken from a parked car. Machine was awake and signed in; OS account has no password on wake. |
| 6 Sep 19:05 | She signs in to the phone app on `pixel-r` with her password, Account → Security, presses **Sign out everywhere**. UI confirms "You have been signed out on all devices." |
| 6 Sep 19:06 | She changes her password. |
| 6 Sep 19:07 | Her phone session continues to work; she keeps taking on-call. |
| 8 Sep 14:40 | Access log: `GET /tickets/queue` plus four ticket views on session `9f2c...` from 81.2.x.x (Bristol, not the depot, not her home). |
| 8 Sep 15:20 | Row `9f2c...` deleted by hand by platform on-call. |

Row `9f2c...` was never deleted by the application between 4 Sep 08:12 and
8 Sep 15:20. The password change did not touch it. The four ticket views on
8 Sep returned 200 and are recorded in the application's own request log, not
in the CDN log.

## Kieran (platform), 9 Sep

> Two things.
>
> One: I do not think the account-security path is where the problem is. I
> signed in to my own account in two browsers, pressed Sign out everywhere in
> one, and the other was dead on the next click. There is a test for that case
> in the suite and it is green. My reading is that the laptop was showing a
> cached page and the queue widget was retrying out of the browser cache.
>
> Two: the fix is to cap every account to one live session — a new sign-in
> kills whatever was there before. That closes this class of incident
> permanently, it is about twenty lines, and every bank app in the world does
> it.

## Usage, last 30 days (same store dump)

| | |
|---|---|
| Agents holding 2+ live sessions at some point in a shift | 78% |
| Median live sessions per agent | 2 |
| Sessions created through the desktop launcher | 71% |
| Sessions created with a password | 29% |
| Devices the on-call pager delivers to | the phone app session only |
