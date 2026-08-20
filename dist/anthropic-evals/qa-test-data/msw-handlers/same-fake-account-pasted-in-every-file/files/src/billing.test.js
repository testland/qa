import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadOutstandingTotal } from './billing.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
  http.get('https://api.example.com/invoices', () =>
    HttpResponse.json([
      { id: 'inv-1', amount: 1200, paid: false },
      { id: 'inv-2', amount: 450, paid: true },
    ]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('sums the unpaid invoices', async () => {
  expect(await loadOutstandingTotal()).toBe(1200);
});
