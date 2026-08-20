import { expect, test } from 'vitest';
import { fetchQuote } from './client.js';

test('returns the quote', async () => {
  const quote = await fetchQuote('ACME');
  expect(quote.price).toBe(101.5);
  expect(quote.currency).toBe('USD');
});
