import { afterEach, expect, test, vi } from 'vitest';
import { searchUsers } from './api-client.js';

afterEach(() => vi.unstubAllGlobals());

test('returns search matches', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ matches: [{ id: 7, name: 'Grace' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  const result = await searchUsers({ token: 't-1', query: 'gr' });
  expect(result.matches[0].name).toBe('Grace');
});
