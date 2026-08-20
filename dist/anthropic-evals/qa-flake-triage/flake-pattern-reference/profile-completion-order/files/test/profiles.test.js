'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfiles } = require('../src/profiles');

test('every requested profile comes back', async () => {
  const profiles = await loadProfiles(['u-1', 'u-2', 'u-3', 'u-4']);

  assert.deepEqual(
    profiles.map((p) => p.id),
    ['u-1', 'u-2', 'u-3', 'u-4']
  );
});

test('a profile carries its team', async () => {
  const profiles = await loadProfiles(['u-2', 'u-3']);

  assert.equal(profiles[0].team, 'platform');
});

test('an empty request returns nothing', async () => {
  const profiles = await loadProfiles([]);

  assert.equal(profiles.length, 0);
});
