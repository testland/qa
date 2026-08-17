import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadUnreadCount } from './notifications.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
  http.get('https://api.example.com/notifications', () =>
    HttpResponse.json([
      { id: 'n-1', read: false },
      { id: 'n-2', read: true },
    ]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('counts the unread notifications', async () => {
  expect(await loadUnreadCount()).toBe(1);
});
