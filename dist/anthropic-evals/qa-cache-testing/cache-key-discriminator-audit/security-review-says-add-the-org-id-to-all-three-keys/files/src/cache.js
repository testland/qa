'use strict';

// The single Redis instance in front of the members API. Every organisation
// on the platform reads and writes through this one store.
function createCache() {
  const store = new Map();
  return {
    get: (key) => (store.has(key) ? JSON.parse(store.get(key)) : null),
    set: (key, value) => {
      store.set(key, JSON.stringify(value));
    },
    del: (key) => store.delete(key),
    keys: () => [...store.keys()],
    size: () => store.size,
  };
}

module.exports = { createCache };
