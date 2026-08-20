import { expect, test } from 'vitest';
import { formatCents } from './money.js';

test('formats cents as currency', () => {
  expect(formatCents(120000)).toBe('$1,200.00');
});
