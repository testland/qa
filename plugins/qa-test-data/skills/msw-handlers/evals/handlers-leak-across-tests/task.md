# A new test at the bottom of the file fails for no reason

## Problem Description

`src/reports.test.js` has two cases and both pass. When a colleague appended a
third case that asserts the report timestamp, it failed with `status:
'degraded'` - a value the new test never asked for and that the default mock
never returns.

Moving the new case above the "service is down" case makes it pass again, which
is how we found out the file only works in the order it happens to be written
in. Running `npx vitest run --sequence.shuffle` fails on roughly half the runs.

We would like the third case back, and we would like it to stop mattering where
in the file a case sits.

`src/reports.js` is correct and is used by other teams; leave it alone.

## Output Specification

1. Add a third case to `src/reports.test.js` asserting `generatedAt` is passed
   through from the API response untouched.
2. `npm test` passes, and `npx vitest run --sequence.shuffle` passes on repeated
   runs - no case may depend on which cases ran before it.
3. The "service is down" case must keep asserting the degraded mapping.
4. Do not change `src/reports.js`, do not change the default response in
   `src/mocks/handlers.js`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "reporting-web",
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
import { afterAll, beforeAll } from 'vitest';
import { server } from './src/mocks/node.js';

beforeAll(() => server.listen());
afterAll(() => server.close());

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/reports/daily', () =>
    HttpResponse.json({
      id: 'daily',
      rows: 128,
      generatedAt: '2026-03-01T00:00:00Z',
    }),
  ),
];

=============== FILE: src/mocks/node.js ===============
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

=============== FILE: src/reports.js ===============
export async function loadDailyReport() {
  const res = await fetch('https://api.example.com/reports/daily');
  if (res.status >= 500) return { id: 'daily', status: 'degraded', rows: 0 };
  if (!res.ok) throw new Error(`report request failed: ${res.status}`);
  const body = await res.json();
  return { ...body, status: 'ok' };
}

=============== FILE: src/reports.test.js ===============
import { expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/node.js';
import { loadDailyReport } from './reports.js';

test('returns the report rows', async () => {
  const report = await loadDailyReport();
  expect(report.rows).toBe(128);
  expect(report.status).toBe('ok');
});

test('marks the report degraded when the service is down', async () => {
  server.use(
    http.get(
      'https://api.example.com/reports/daily',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );

  const report = await loadDailyReport();
  expect(report.status).toBe('degraded');
});
