'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('./cache');
const { people } = require('../db/seed');
const { sessionFor } = require('./sessions');
const { loadProfile } = require('./profileService');
const { loadPreferences, savePreferences } = require('./preferenceService');
const { loadOrgSettings } = require('./orgSettingsService');
const { onPersonUpdated } = require('./webhooks');

const BEN = '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80';

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

test('preferences come back for the person who asked', () => {
  const cache = createCache();
  assert.equal(loadPreferences(cache, sessionFor('acme', 1)).timezone, 'Europe/London');
});

test('saving preferences shows the new value on the next read', () => {
  const cache = createCache();
  const session = sessionFor('globex', 1);
  assert.equal(loadPreferences(cache, session).theme, 'light');
  savePreferences(cache, session, { theme: 'dark' });
  assert.equal(loadPreferences(cache, session).theme, 'dark');
});

test('org settings come back for the organisation that asked', () => {
  const cache = createCache();
  const settings = loadOrgSettings(cache, sessionFor('globex', 1));
  assert.equal(settings.orgName, 'Globex Industrial');
  assert.equal(settings.seatLimit, 40);
});

test('an HR update writes the new display name through', () => {
  const cache = createCache();
  onPersonUpdated(cache, BEN, { displayName: 'Ben Larsen-Holt' });
  assert.equal(people.find((p) => p.personId === BEN).displayName, 'Ben Larsen-Holt');
});
