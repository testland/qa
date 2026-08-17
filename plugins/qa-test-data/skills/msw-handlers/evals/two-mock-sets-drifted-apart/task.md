# Unit tests were green while the page showed "Plan: undefined"

## Problem Description

The profile API renamed two fields three weeks ago. The response is now:

```json
{ "id": "u-1", "displayName": "Ada Lovelace", "plan": { "tier": "pro", "seats": 25 } }
```

Whoever did the upgrade updated the fake responses the Cypress suite uses and
never touched the ones the unit suite uses. So `cypress/support/e2e.js` returns
the new shape and `src/test/server.js` still returns `display_name`, a string
`plan`, and a top-level `seats`.

`src/profile.js` still reads the old names. Its unit test passes - it is being
fed the old shape by the only mock definition it can see. Meanwhile production
renders "Plan: undefined".

We do not want to find this again. The fake response for an endpoint should
exist in one place that both the Cypress run and the unit run consume, so that
an API change is a one-file change and cannot be applied to half the suite.

## Output Specification

1. Each endpoint's fake response must be declared exactly once, in a module both
   the browser (Cypress) side and the Node (Vitest) side consume. Neither side
   may declare its own copy.
2. That single definition returns the documented response above, and only that -
   no extra fields kept around to satisfy old readers.
3. Update `src/profile.js` to read the current shape and return
   `{ id, name, tier, seats }` as it does today.
4. Update `src/profile.test.js` so it asserts the same values against the
   corrected definition, and `npm test` passes.
5. Cypress must still start its mocks from its support file, and no dependency
   may be added.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "profile-web",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "e2e": "cypress run"
  },
  "devDependencies": {
    "cypress": "^13.16.0",
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
import { server } from './src/test/server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

=============== FILE: src/test/server.js ===============
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({
      id: 'u-1',
      display_name: 'Ada Lovelace',
      plan: 'pro',
      seats: 25,
    }),
  ),
);

=============== FILE: cypress/support/e2e.js ===============
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

const worker = setupWorker(
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({
      id: 'u-1',
      displayName: 'Ada Lovelace',
      plan: { tier: 'pro', seats: 25 },
    }),
  ),
);

before(() => worker.start({ onUnhandledRequest: 'error' }));

=============== FILE: src/profile.js ===============
export async function loadProfile() {
  const res = await fetch('https://api.example.com/profile');
  if (!res.ok) throw new Error(`profile request failed: ${res.status}`);
  const body = await res.json();

  return {
    id: body.id,
    name: body.display_name,
    tier: body.plan,
    seats: body.seats,
  };
}

=============== FILE: src/profile.test.js ===============
import { expect, test } from 'vitest';
import { loadProfile } from './profile.js';

test('maps the profile response', async () => {
  const profile = await loadProfile();
  expect(profile.name).toBe('Ada Lovelace');
  expect(profile.tier).toBe('pro');
  expect(profile.seats).toBe(25);
});
