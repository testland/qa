'use strict';

function createEventStore() {
  const entries = new Map();
  return {
    async get(key) { return entries.has(key) ? entries.get(key) : null; },
    async setIfAbsent(key, value) {
      if (entries.has(key)) return false;
      entries.set(key, value);
      return true;
    },
    size() { return entries.size; },
  };
}

module.exports = { createEventStore };
