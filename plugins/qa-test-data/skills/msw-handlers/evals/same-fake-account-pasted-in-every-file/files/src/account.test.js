import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadAccount } from './account.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('maps the account response', async () => {
  const account = await loadAccount();
  expect(account.tier).toBe('pro');
  expect(account.seatsLeft).toBe(10);
});
