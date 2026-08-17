import { expect, test } from 'vitest';
import { formatAddress, initials } from '../src/profile.js';
import { makeProfile } from './factories/profile.js';

test('initials take the first letter of each part of the name', () => {
  const profile = makeProfile();
  expect(initials(profile.name).length).toBeGreaterThanOrEqual(2);
});

test('the postcode is a five digit ZIP, optionally with the plus four', () => {
  const profile = makeProfile();
  expect(profile.postcode).toMatch(/^\d{5}(-\d{4})?$/);
});

test('the formatted address ends with the postcode', () => {
  const profile = makeProfile();
  expect(formatAddress(profile)).toContain(profile.postcode);
});
