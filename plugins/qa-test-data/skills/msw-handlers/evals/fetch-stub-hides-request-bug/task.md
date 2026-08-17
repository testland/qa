# Green tests, 401s in production

## Problem Description

Our gateway started rejecting every call from this service with a 401. The
credential is being sent as an `access_token` query parameter; the gateway now
requires `Authorization: Bearer <token>` and ignores the query string. It has
been wrong in `src/api-client.js` for months.

Both test files are green and always have been. They replace `fetch` with a
function that returns a canned payload and never looks at the arguments it was
called with, so the URL builder, the query parameters and the headers are never
exercised by anything. The tests would have stayed green if we had sent the
request to a different host.

We want tests that would have caught this: the client's real request-building
code must run, and the request that actually leaves the client must be what the
assertions look at. The two files also duplicate the same canned payload setup,
which we would rather define once.

## Output Specification

1. Rework `src/users.test.js` and `src/search.test.js` so the doubles no longer
   replace `fetch` and the request the client actually produces is what the
   tests observe.
2. Assert, for the users listing, that the outgoing request carries `page` and
   `per_page` query parameters and an `Authorization: Bearer <token>` header,
   and that the token does not appear in the query string.
3. Fix `src/api-client.js` so it sends the credential in that header.
4. Both files keep asserting the parsed results they assert today, and
   `npm test` passes.
5. Nothing may reach the real network, and no dependency may be added -
   everything needed is already installed.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "directory-client",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "msw": "^2.6.6",
    "vitest": "^2.1.8"
  }
}

=============== FILE: vitest.config.js ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});

=============== FILE: src/api-client.js ===============
const BASE = 'https://api.example.com';

export function buildUrl(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiFetch(path, { token, params } = {}) {
  const res = await fetch(buildUrl(path, { ...params, access_token: token }), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export function listUsers({ token, page, perPage }) {
  return apiFetch('/users', { token, params: { page, per_page: perPage } });
}

export function searchUsers({ token, query }) {
  return apiFetch('/users/search', { token, params: { q: query } });
}

=============== FILE: src/users.test.js ===============
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

=============== FILE: src/search.test.js ===============
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
