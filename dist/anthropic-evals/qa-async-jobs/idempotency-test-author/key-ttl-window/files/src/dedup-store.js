'use strict';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createDedupStore({ ttlMs = SEVEN_DAYS_MS, now }) {
  const entries = new Map();
  const stale = (entry, at) => at - entry.storedAt >= ttlMs;

  return {
    putIfAbsent(key, value) {
      const at = now();
      const existing = entries.get(key);
      if (existing && !stale(existing, at)) return false;
      entries.set(key, { value, storedAt: at });
      return true;
    },

    get(key) {
      const at = now();
      const entry = entries.get(key);
      if (!entry) return null;
      if (stale(entry, at)) { entries.delete(key); return null; }
      return entry.value;
    },

    sweep() {
      const at = now();
      let removed = 0;
      for (const [key, entry] of entries) {
        if (stale(entry, at)) { entries.delete(key); removed += 1; }
      }
      return removed;
    },

    size() { return entries.size; },
    ttlMs,
  };
}

module.exports = { createDedupStore, SEVEN_DAYS_MS };
