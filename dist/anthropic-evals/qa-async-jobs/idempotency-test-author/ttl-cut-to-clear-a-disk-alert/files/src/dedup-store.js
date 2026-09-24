'use strict';

// In-memory stand-in for the Redis instance: value with an expiry, expired
// entries are gone.
const TTL_SECONDS = 24 * 60 * 60;

class DedupStore {
  constructor(ttlSeconds = TTL_SECONDS) {
    this.ttl = ttlSeconds;
    this.map = new Map();
  }

  _expired(entry, now) {
    return now >= entry.storedAt + this.ttl * 1000;
  }

  get(key, now = Date.now()) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (this._expired(e, now)) { this.map.delete(key); return undefined; }
    return e.value;
  }

  putIfAbsent(key, value, now = Date.now()) {
    const existing = this.get(key, now);
    if (existing !== undefined) return false;
    this.map.set(key, { value, storedAt: now });
    return true;
  }

  size(now = Date.now()) {
    let n = 0;
    for (const [, e] of this.map) { if (!this._expired(e, now)) n++; }
    return n;
  }
}

module.exports = { DedupStore, TTL_SECONDS };
