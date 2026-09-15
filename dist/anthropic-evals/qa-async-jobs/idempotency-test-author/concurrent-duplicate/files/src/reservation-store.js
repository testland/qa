'use strict';

function createReservationStore() {
  const entries = new Map();

  return {
    async read(key) {
      const entry = entries.get(key);
      return entry && entry.state === 'done' ? entry.response : null;
    },

    async write(key, response) {
      entries.set(key, { state: 'done', response, joined: Promise.resolve(response) });
    },

    // Test-and-insert in one step: nothing awaits between the lookup and the insert.
    async claim(key) {
      const entry = entries.get(key);
      if (entry) return { acquired: false, joined: entry.joined };
      let settle;
      const joined = new Promise((resolve) => { settle = resolve; });
      entries.set(key, { state: 'pending', response: null, joined, settle });
      return { acquired: true, joined };
    },

    settle(key, response) {
      const entry = entries.get(key);
      entry.state = 'done';
      entry.response = response;
      entry.settle(response);
    },

    size() { return entries.size; },
  };
}

module.exports = { createReservationStore };
