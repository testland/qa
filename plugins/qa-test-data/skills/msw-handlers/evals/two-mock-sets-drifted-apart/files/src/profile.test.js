import { expect, test } from 'vitest';
import { loadProfile } from './profile.js';

test('maps the profile response', async () => {
  const profile = await loadProfile();
  expect(profile.name).toBe('Ada Lovelace');
  expect(profile.tier).toBe('pro');
  expect(profile.seats).toBe(25);
});
