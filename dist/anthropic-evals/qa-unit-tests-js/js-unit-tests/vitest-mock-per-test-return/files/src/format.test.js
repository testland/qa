import { expect, test } from 'vitest';

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

test('builds initials from a full name', () => {
  expect(initials('Ada Lovelace')).toBe('AL');
});
