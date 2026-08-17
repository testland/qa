'use strict';

const cache = {
  async get(key) {
    return redis.get(key);
  },
  async set(key, value) {
    return redis.set(key, value, 'EX', 300);
  },
};

module.exports = { cache };
