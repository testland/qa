# The stolen laptop was still reading tickets two days after she pressed Sign out everywhere

## Problem Description

`deskline` is our support-desk product. Agents work a shared queue on a
desktop and carry a phone app for on-call paging.

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

Kieran on platform has put two things on the ticket. The first is that the
laptop session should have died at 19:05 and did not, and he has not had time
to find out why. The second is his proposed fix, which is to cap every account
to one live session — new sign-in kills the old one — on the grounds that it
closes this whole class of incident and is about twenty lines. The usage
numbers he is proposing that against are in the attached incident file.

The repo is attached with five green tests on the session module. Both the
account-security paths are in `src/sessions.js`.

## Output Specification

1. Write `src/logout.test.js`. Do not modify `src/sessions.test.js`.
2. Repair `src/sessions.js` wherever your tests show it does not do what the
   account page tells the agent it is doing.
3. Run `npm test`. The tree you hand back must be green.
4. Write `docs/incident-4471-response.md`: what the laptop session was still
   able to do after 19:05 and why, what you changed, what we have to tell
   Ravensbourne, and a direct answer to Kieran's second point.

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

=============== FILE: src/sessions.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessions } = require('./sessions');

test('signing in gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'laptop-7');
  assert.equal(sessions.request(sid), 200);
});

test('an unknown session id is refused', () => {
  const sessions = createSessions();
  assert.equal(sessions.request('not-a-real-session'), 401);
});

test('signing out clears the session cookie', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'laptop-7');
  const res = sessions.logout(sid);
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /Max-Age=0/);
});

test('sign out everywhere succeeds for a signed-in agent', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.logoutAll(sid).status, 200);
});

test('sign out everywhere is refused for an unknown session', () => {
  const sessions = createSessions();
  assert.equal(sessions.logoutAll('not-a-real-session').status, 401);
});

=============== FILE: docs/incident-4471.md ===============
# Incident 4471 — laptop taken, Bristol depot

## Timeline

| When | What |
|---|---|
| 4 Sep 08:12 | `r.adeyemi` signs in on `laptop-7`. Session row `9f2c…` created. |
| 6 Sep 18:40 | Laptop taken from a parked car. Machine was awake and signed in; OS account has no password on wake. |
| 6 Sep 19:05 | She signs in on her phone (`pixel-r`), Account → Security, presses **Sign out everywhere**. UI confirms "You have been signed out on all devices." |
| 6 Sep 19:06 | She changes her password. |
| 6 Sep 19:07 | Her phone session continues to work; she keeps taking on-call. |
| 8 Sep 14:40 | Access log: `GET /tickets/queue` plus four ticket views on session `9f2c…` from 81.2.x.x (Bristol, not the depot, not her home). |
| 8 Sep 15:20 | Row `9f2c…` deleted by hand by platform on-call. |

Row `9f2c…` was never deleted by the application between 4 Sep 08:12 and
8 Sep 15:20. The password change did not touch it.

## Kieran (platform), 9 Sep

> Two things.
>
> One: that session should have stopped working at 19:05 and it did not, so
> something in the account-security path is wrong. I have not had time to look
> at it.
>
> Two: the fix is obvious and I would rather do it than chase the first thing.
> Cap every account to one live session — a new sign-in kills whatever was
> there before. That closes this class of incident permanently, it is about
> twenty lines, and every bank app in the world does it.

## Usage, last 30 days (same store dump)

| | |
|---|---|
| Agents holding 2+ live sessions at some point in a shift | 78% |
| Median live sessions per agent | 2 |
| Devices the on-call pager delivers to | the phone app session only |

Sev-1 #3102 (March) and Sev-1 #3390 (June) were both paged to an engineer
whose phone session had ended without them noticing. Acknowledgement took 41
and 63 minutes respectively; the post-incident actions on both were "make sure
the phone session survives a desktop sign-in".
