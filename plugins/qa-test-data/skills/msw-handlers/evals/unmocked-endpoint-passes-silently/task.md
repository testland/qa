# CI is making real calls to our API, and one test is lying

## Problem Description

Our egress proxy logs show requests to `api.example.com` coming from the CI test
job. Nothing in the suite is supposed to touch the network.

Tracing it back: `loadDashboard()` calls two endpoints. The profile one is
defined in `src/mocks/handlers.js`. The notifications one never was, so that
request leaves the process. In CI it fails, `loadDashboard` swallows the error
and falls back to an empty list, and the case asserting `unread` is `0` passes -
for the wrong reason. That case would pass if the notifications feature were
deleted entirely.

We want the suite to be loud about this instead: if any code under test makes a
request nobody has defined a response for, the test that made it should fail and
name the URL, rather than quietly reaching the internet and getting whatever it
gets.

`src/dashboard.js` behaves correctly and must not change - the missing coverage
is a test-harness problem, not a product one.

## Output Specification

1. A request with no matching definition must fail the test that made it, and
   must not leave the process. This must apply to every test file in the
   project, not only the one below.
2. Add the missing definition for the notifications endpoint to the shared mock
   set: two notifications, one of them unread.
3. Rewrite the second case so it asserts the real unread count against that
   data, and so it would fail if the notifications request were left undefined.
4. `npm test` passes. Do not change `src/dashboard.js` and do not add
   dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "dashboard-web",
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
    setupFiles: ['./vitest.setup.js'],
  },
});

=============== FILE: vitest.setup.js ===============
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/node.js';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada Lovelace' }),
  ),
];

=============== FILE: src/mocks/node.js ===============
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

=============== FILE: src/dashboard.js ===============
export async function loadDashboard(userId) {
  const profileRes = await fetch(`https://api.example.com/users/${userId}`);
  const profile = await profileRes.json();

  let notifications = [];
  try {
    const res = await fetch(`https://api.example.com/users/${userId}/notifications`);
    if (res.ok) notifications = await res.json();
  } catch {
    notifications = [];
  }

  return {
    name: profile.name,
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  };
}

=============== FILE: src/dashboard.test.js ===============
import { expect, test } from 'vitest';
import { loadDashboard } from './dashboard.js';

test('returns the profile name', async () => {
  const view = await loadDashboard('u-1');
  expect(view.name).toBe('Ada Lovelace');
});

test('reports the unread count', async () => {
  const view = await loadDashboard('u-1');
  expect(view.unread).toBe(0);
});
