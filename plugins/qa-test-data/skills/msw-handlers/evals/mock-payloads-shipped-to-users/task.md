# Real users are seeing "John Doe"

## Problem Description

Two customers reported that the account page showed the name "John Doe" and a
plan they never bought. It is our fake test data, served from inside their
browser.

`npm run build` output confirms it: grepping `dist/` for `John Doe` matches, and
the entry chunk grew by about 40 KB after the mocks were introduced. `src/main.js`
pulls in `./mocks/browser.js` and starts it unconditionally, so every production
visitor downloads and runs the fake API.

We still want the fake responses locally: `npm run dev` and the Cypress suite
both depend on them. And the Vitest suite already gets its responses another way
in the Node process - that part works and must not be disturbed.

## Output Specification

1. A production build must contain neither the fake payloads nor the code that
   starts them. `npm run build && grep -r "John Doe" dist/` must find nothing,
   and no request interception may be started for a production visitor.
2. `npm run dev` and the Cypress run must still receive the mocked responses.
3. `npm test` must still pass with its setup unchanged.
4. Do not change `src/mocks/handlers.js` or `src/app.js`, and do not add
   dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "account-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "msw": "^2.6.6",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}

=============== FILE: vite.config.js ===============
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
  },
});

=============== FILE: src/main.js ===============
import { worker } from './mocks/browser.js';
import { loadProfile } from './app.js';

worker.start({ onUnhandledRequest: 'bypass' });

loadProfile().then((profile) => {
  document.querySelector('#name').textContent = profile.name;
  document.querySelector('#plan').textContent = profile.plan;
});

=============== FILE: src/app.js ===============
export async function loadProfile() {
  const res = await fetch('https://api.example.com/profile');
  if (!res.ok) throw new Error(`profile request failed: ${res.status}`);
  return res.json();
}

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({ id: 'u-1', name: 'John Doe', plan: 'enterprise' }),
  ),
];

=============== FILE: src/mocks/browser.js ===============
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);

=============== FILE: src/mocks/node.js ===============
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

=============== FILE: vitest.setup.js ===============
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/mocks/node.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

=============== FILE: src/app.test.js ===============
import { expect, test } from 'vitest';
import { loadProfile } from './app.js';

test('reads the profile', async () => {
  const profile = await loadProfile();
  expect(profile.name).toBe('John Doe');
  expect(profile.plan).toBe('enterprise');
});
