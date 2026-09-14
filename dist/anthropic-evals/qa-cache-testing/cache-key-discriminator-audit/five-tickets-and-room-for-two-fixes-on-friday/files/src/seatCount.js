'use strict';

const db = require('./db');

function seatCountKey(tenantId) {
  return `seats:${tenantId}`;
}

function loadSeatCount(cache, session) {
  const key = seatCountKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const org = db.org(session.tenantId);
  const value = { used: org.seatsUsed, limit: org.seatLimit };
  cache.set(key, value, 300);
  return value;
}

module.exports = { seatCountKey, loadSeatCount };
