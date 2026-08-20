import { afterEach, expect, test, vi } from 'vitest';
import { listUsers } from './api-client.js';

afterEach(() => vi.unstubAllGlobals());

test('returns a page of users', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ users: [{ id: 1, name: 'Ada' }], page: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  const result = await listUsers({ token: 't-1', page: 2, perPage: 50 });
  expect(result.users).toHaveLength(1);
  expect(result.page).toBe(2);
});
