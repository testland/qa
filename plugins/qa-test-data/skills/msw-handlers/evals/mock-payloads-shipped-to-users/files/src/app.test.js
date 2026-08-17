import { expect, test } from 'vitest';
import { loadProfile } from './app.js';

test('reads the profile', async () => {
  const profile = await loadProfile();
  expect(profile.name).toBe('John Doe');
  expect(profile.plan).toBe('enterprise');
});
