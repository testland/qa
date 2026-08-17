# The failure branches of our quote client have never run

## Problem Description

`src/client.js` has three behaviours nobody has ever tested. Coverage shows the
whole lower half of the function unexecuted.

- It retries once when the service answers 503, and returns the data if the
  second attempt succeeds.
- If the request cannot get an answer at all - the host is unreachable, the
  connection drops, the machine is offline - it returns `{ offline: true }`
  instead of throwing.
- On any other error status it throws, using the `message` from the error body
  when there is one.

Only the happy path is covered. Someone previously tried to cover the offline
case by replacing `fetch` with a function that rejects; the result drifted from
what the client actually does and was deleted.

We need the three branches covered, exercising the same code path production
takes - the client's own request must run in each case.

## Output Specification

Add cases to `src/client.test.js` covering:

1. The first attempt answers 503 and the retry succeeds - the returned quote
   comes from the second response, and the first response's body is not what is
   asserted.
2. The request gets no response at all - the client returns `{ symbol,
   offline: true }`. This must be a connection-level failure, not an error
   status code.
3. The service answers 500 with `{"message": "quote service unavailable"}` -
   the call rejects with that message.

The existing case must keep passing and must not be affected by any of the
above, in any run order. Do not change `src/client.js`, do not replace `fetch`,
and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "quotes-client",
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/quotes/:symbol', () =>
    HttpResponse.json({ price: 101.5, currency: 'USD' }),
  ),
];

=============== FILE: src/mocks/node.js ===============
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

=============== FILE: src/client.js ===============
const RETRY_DELAY_MS = 5;

export async function fetchQuote(symbol) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res;
    try {
      res = await fetch(`https://api.example.com/quotes/${symbol}`);
    } catch {
      return { symbol, offline: true };
    }

    if (res.status === 503 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `quote request failed: ${res.status}`);
    }

    return { symbol, ...(await res.json()) };
  }

  throw new Error('quote unavailable after retry');
}

=============== FILE: src/client.test.js ===============
import { expect, test } from 'vitest';
import { fetchQuote } from './client.js';

test('returns the quote', async () => {
  const quote = await fetchQuote('ACME');
  expect(quote.price).toBe(101.5);
  expect(quote.currency).toBe('USD');
});
