# Session expiry is only tested "well after" the deadline

## Problem Description

`src/session.js` expires a session 30 minutes after its last activity, and a
sweeper evicts expired sessions from the store every minute.

The existing test proves a session two hours old is expired. That tells us
nothing about the boundary, and support has reported sessions surviving a few
minutes past the half hour. We need the boundary pinned down, and we need the
sweeper covered - right now nothing tests it at all.

## Output Specification

Add `src/session.test.js` covering:

1. A session is still valid one millisecond before the TTL elapses.
2. A session is expired exactly at the TTL.
3. Activity refreshes the deadline.
4. The sweeper removes expired sessions from the store and leaves live ones.

Keep the existing `src/session.legacy.test.js` passing and unchanged.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "auth-service",
  "version": "3.0.2",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: src/session.js ===============
const SESSION_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

function createSession(id) {
  return { id, lastSeenAt: Date.now() };
}

function touch(session) {
  session.lastSeenAt = Date.now();
  return session;
}

function isExpired(session) {
  return Date.now() - session.lastSeenAt >= SESSION_TTL_MS;
}

function startSweeper(store) {
  return setInterval(() => {
    for (const [id, session] of store.entries()) {
      if (isExpired(session)) {
        store.delete(id);
      }
    }
  }, SWEEP_INTERVAL_MS);
}

module.exports = {
  createSession,
  touch,
  isExpired,
  startSweeper,
  SESSION_TTL_MS,
  SWEEP_INTERVAL_MS,
};

=============== FILE: src/session.legacy.test.js ===============
const { createSession, isExpired, SESSION_TTL_MS } = require('./session');

describe('isExpired', () => {
  it('expires a session from two hours ago', () => {
    const session = createSession('s1');
    session.lastSeenAt = Date.now() - 2 * 60 * 60 * 1000;
    expect(isExpired(session)).toBe(true);
  });

  it('keeps a session created just now', () => {
    expect(isExpired(createSession('s2'))).toBe(false);
  });
});

describe('SESSION_TTL_MS', () => {
  it('is thirty minutes', () => {
    expect(SESSION_TTL_MS).toBe(1800000);
  });
});
