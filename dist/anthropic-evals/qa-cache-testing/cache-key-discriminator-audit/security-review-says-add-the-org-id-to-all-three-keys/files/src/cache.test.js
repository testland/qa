'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('./cache');
const { sessionFor } = require('./sessions');
const { loadProfile } = require('./profileService');
const { loadPreferences } = require('./preferenceService');
const { loadOrgSettings } = require('./orgSettingsService');

test('a value survives a round trip', () => {
  const cache = createCache();
  cache.set('k', { a: 1 });
  assert.deepEqual(cache.get('k'), { a: 1 });
});

test('a miss returns null', () => {
  assert.equal(createCache().get('nope'), null);
});

test('a profile is served from the cache on the second call', () => {
  const cache = createCache();
  const session = sessionFor('acme', 2);
  assert.equal(loadProfile(cache, session).displayName, 'Tom Ilves');
  assert.equal(cache.size(), 1);
  assert.equal(loadProfile(cache, session).displayName, 'Tom Ilves');
  assert.equal(cache.size(), 1);
});

test('someone who belongs to two organisations has one set of preferences', () => {
  const cache = createCache();
  const viaAcme = loadPreferences(cache, sessionFor('acme', 2));
  const viaGlobex = loadPreferences(cache, sessionFor('globex', 3));
  assert.equal(viaAcme.timezone, 'Europe/Tallinn');
  assert.deepEqual(viaGlobex, viaAcme);
  assert.equal(cache.size(), 1);
});

test('an admin sees the billing fields on org settings', () => {
  const cache = createCache();
  const settings = loadOrgSettings(cache, sessionFor('globex', 1));
  assert.equal(settings.orgName, 'Globex Industrial');
  assert.equal(settings.seatLimit, 40);
});
