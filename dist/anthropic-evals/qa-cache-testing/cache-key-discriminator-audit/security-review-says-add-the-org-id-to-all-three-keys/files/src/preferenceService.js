'use strict';

const { preferences } = require('../db/seed');

function preferenceKey(personId) {
  return `prefs:${personId}`;
}

function loadPreferences(cache, session) {
  const key = preferenceKey(session.personId);
  const hit = cache.get(key);
  if (hit) return hit;

  const row = preferences.find((p) => p.personId === session.personId);
  const prefs = { theme: row.theme, digest: row.digest, timezone: row.timezone };
  cache.set(key, prefs);
  return prefs;
}

function savePreferences(cache, session, patch) {
  const row = preferences.find((p) => p.personId === session.personId);
  Object.assign(row, patch);
  cache.del(preferenceKey(session.personId));
}

module.exports = { preferenceKey, loadPreferences, savePreferences };
