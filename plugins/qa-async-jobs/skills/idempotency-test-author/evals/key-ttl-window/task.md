# Dedup keys are kept forever in one environment and we do not know why

## Problem Description

`src/notificationDedup.js` suppresses duplicate notification sends using a
key store with a time-to-live. The TTL exists so the store does not grow
without bound - we had a memory incident traced to a dedup map that was never
pruned.

The store now takes a clock so its behaviour is testable without waiting. No
test currently covers what happens at the TTL boundary, and none covers
whether expired keys are actually released rather than merely reported as
absent.

## Output Specification

Add `src/notificationDedup.test.js` covering the suppression window: what
happens just inside it, exactly at its edge, and after it, plus evidence that
expired entries stop occupying the store.

Run `npm test` before you finish; it must pass.

Leave `src/notificationDedup.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "notifications",
  "version": "3.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/notificationDedup.js ===============
'use strict';

const DEFAULT_TTL_MS = 15 * 60 * 1000;

function createExpiringStore({ ttlMs = DEFAULT_TTL_MS, now }) {
  const entries = new Map();

  function isStale(entry, at) {
    return at - entry.storedAt >= ttlMs;
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) {
        return null;
      }
      if (isStale(entry, now())) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, storedAt: now() });
    },
    sweep() {
      const at = now();
      let removed = 0;
      for (const [key, entry] of entries) {
        if (isStale(entry, at)) {
          entries.delete(key);
          removed += 1;
        }
      }
      return removed;
    },
    size() {
      return entries.size;
    },
  };
}

function createNotifier({ store, transport }) {
  return function send(notification) {
    const key = `${notification.userId}:${notification.kind}`;
    if (store.get(key) !== null) {
      return { status: 'suppressed' };
    }
    transport.deliver(notification);
    store.set(key, true);
    return { status: 'sent' };
  };
}

function createTransport() {
  const delivered = [];
  return {
    deliver(notification) {
      delivered.push(notification);
    },
    deliveredCount() {
      return delivered.length;
    },
  };
}

module.exports = { createExpiringStore, createNotifier, createTransport, DEFAULT_TTL_MS };

=============== FILE: src/notificationDedup.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createExpiringStore,
  createNotifier,
  createTransport,
} = require('./notificationDedup');

test('a repeated notification is suppressed', () => {
  let clock = 0;
  const transport = createTransport();
  const store = createExpiringStore({ now: () => clock });
  const send = createNotifier({ store, transport });
  const notification = { userId: 'u_1', kind: 'digest' };

  assert.equal(send(notification).status, 'sent');
  assert.equal(send(notification).status, 'suppressed');
  assert.equal(transport.deliveredCount(), 1);
});
