import { expect, test, vi } from 'vitest';
import { createToken, isExpired } from './token.js';

const FIXED_NOW = 1_700_000_000_000;

test('stamps the issue time and a thirty minute expiry', () => {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

  const token = createToken('u-1');

  expect(token.userId).toBe('u-1');
  expect(token.issuedAt).toBe(FIXED_NOW);
  expect(token.expiresAt).toBe(FIXED_NOW + 1_800_000);
});
