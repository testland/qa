'use strict';

// The single Redis instance behind the billing app. Shared by every
// organisation on the platform.
function createCache(clock = () => Date.now()) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= clock()) {
        store.delete(key);
        return null;
      }
      return JSON.parse(entry.value);
    },
    set(key, value, ttlSeconds) {
      store.set(key, {
        value: JSON.stringify(value),
        expiresAt: clock() + ttlSeconds * 1000,
      });
    },
    del(key) {
      store.delete(key);
    },
    keys: () => [...store.keys()],
    size: () => store.size,
  };
}

module.exports = { createCache };
