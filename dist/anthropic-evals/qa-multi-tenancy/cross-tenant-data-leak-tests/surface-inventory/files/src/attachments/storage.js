'use strict';

const store = {
  async put(key, body) {
    return objectStore.write(key, body);
  },
  async get(key) {
    return objectStore.read(key);
  },
  async signedUrl(key, ttlSeconds) {
    return objectStore.sign(key, ttlSeconds);
  },
};

module.exports = { store };
