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
