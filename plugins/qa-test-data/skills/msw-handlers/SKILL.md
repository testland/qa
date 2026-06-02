---
name: msw-handlers
description: "Authors Mock Service Worker (MSW) request handlers for both browser and Node.js test environments using the `http.get` / `http.post` / `HttpResponse.json` API, wires them via `setupWorker` (browser) or `setupServer` (Node), and manages the test lifecycle (`server.listen` / `resetHandlers` / `close`). Use when the project uses JavaScript / TypeScript and needs to mock fetch / XHR at the network layer for both Vitest / Jest unit tests and Cypress / Playwright integration tests."
rating: 26
d6: 4
archetype: S1
---

# msw-handlers

## Overview

Mock Service Worker (MSW) intercepts HTTP requests at the network
layer using **Service Workers in the browser** and a **request-
interception adapter in Node.js** ([msw-getting-started][gs]). The
same handler set works for both - the test author writes one
`http.get` mock and uses it from Vitest unit tests AND from a
Cypress browser test.

[gs]: https://mswjs.io/docs/getting-started

## When to use

- The project is JavaScript / TypeScript.
- Tests need to mock HTTP at the **same layer as the SUT** - 
  intercepting actual `fetch` / `XHR` calls rather than stubbing
  the HTTP client library.
- Both browser tests (Cypress / Playwright) and Node tests (Vitest /
  Jest) need the same mock data - MSW's cross-environment
  consistency is its key advantage.
- The team wants per-test handler overrides (`server.use(...)`)
  layered on top of project-wide defaults.

If the project is JVM, use [`wiremock-stubs`](../wiremock-stubs/SKILL.md).
For multi-protocol mocking, see
[`mountebank-imposters`](../mountebank-imposters/SKILL.md).

## Install

```bash
npm i msw --save-dev
```

(Per [msw-getting-started][gs].)

For browser setup, also generate the worker script:

```bash
npx msw init public/ --save
```

This places `mockServiceWorker.js` in your public directory; the
worker script is what the browser registers to intercept requests.

## Authoring handlers

Per [msw-getting-started][gs]:

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({ id: 'abc-123', firstName: 'John' });
  }),

  http.post('https://api.example.com/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ order_id: 42, ...body }, { status: 201 });
  }),

  http.get('https://api.example.com/orders/:id', ({ params }) => {
    return HttpResponse.json({ order_id: Number(params.id), status: 'shipped' });
  }),
];
```

Handler signature: `http.<verb>(url, resolver)`. The resolver
receives `{ request, params, cookies }` and returns an
`HttpResponse`.

### `HttpResponse` static helpers

| Helper                        | Effect                                                |
|-------------------------------|-------------------------------------------------------|
| `HttpResponse.json(body, init?)` | JSON response with `Content-Type: application/json`. |
| `HttpResponse.text(body, init?)` | Plain text response.                                  |
| `HttpResponse.error()`         | Network-level error (e.g. simulate offline).         |
| `new HttpResponse(...)`        | Full-control raw response.                            |

The `init` object accepts `status`, `statusText`, `headers` - 
matching the standard `Response` API.

### Pattern matching

| Pattern                                  | Notes                                              |
|------------------------------------------|----------------------------------------------------|
| `'https://api.example.com/orders/:id'`    | Path param exposed via `params.id`.                |
| `'/api/orders'`                            | Same-origin path; matches relative to current host. |
| `'*\\/orders'`                              | Wildcards via standard URL pattern.                |
| `/^\\/api\\/orders\\/[0-9]+$/`              | Regex match.                                        |

## Browser setup - `setupWorker`

```javascript
// src/mocks/browser.js
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start the worker only in development / test
if (process.env.NODE_ENV !== 'production') {
  worker.start();
}
```

(Per [msw-getting-started][gs].)

In a Storybook + MSW combo, kick off `worker.start()` from the
preview file. For Cypress: register the worker before any test
that depends on the mocks.

## Node setup - `setupServer`

```javascript
// src/mocks/node.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```javascript
// vitest.setup.js (or jest.setup.js)
import { server } from './src/mocks/node';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

(Per [msw-getting-started][gs].)

| Hook                  | When                               | Purpose                              |
|-----------------------|------------------------------------|--------------------------------------|
| `server.listen()`     | `beforeAll`                        | Activate mocking.                    |
| `server.resetHandlers()` | `afterEach`                     | Clear per-test overrides.            |
| `server.close()`      | `afterAll`                         | Tear down; release resources.        |
| `server.use(...)`     | Per-test                           | Add / override handlers for the current test only. |

`onUnhandledRequest: 'error'` is the canonical strict mode - fails
the test if the SUT makes any HTTP call that doesn't have a
matching handler. Catches "we forgot to mock that endpoint" silently
passing.

## Per-test handler overrides

```javascript
import { http, HttpResponse } from 'msw';
import { server } from './src/mocks/node';

test('handles 500 error gracefully', async () => {
  server.use(
    http.get('https://api.example.com/user', () =>
      new HttpResponse(null, { status: 500 })
    )
  );

  const result = await fetchUser();
  expect(result.error).toBe('server error');
});
// `server.resetHandlers()` in afterEach reverts to the default handlers
```

This pattern is the canonical way to test error / edge paths
without polluting the default-handlers set.

## CI integration

```yaml
# .github/workflows/test.yml
- run: npm ci
- run: npm test          # Vitest / Jest pick up vitest.setup / jest.setup automatically
```

For Cypress + MSW, also run `npx msw init` in CI to ensure the
service worker script is in `public/`.

## Anti-patterns

| Anti-pattern                                              | Why it fails                                                       | Fix |
|-----------------------------------------------------------|---------------------------------------------------------------------|-----|
| `onUnhandledRequest: 'bypass'` (the default before strict mode) | Test passes despite the SUT calling unmocked endpoints; real network bleeds in. | Always `'error'` in CI. |
| Per-test handler definition (no shared `handlers.js`)      | Duplication; drift between tests; hard to maintain.                | One `handlers.js` per project; `server.use()` for overrides. |
| Forgetting `resetHandlers()`                              | Handlers leak across tests; later test fails because earlier test's override is still active. | Always `afterEach(() => server.resetHandlers())`. |
| Using MSW for tests that exercise network errors only      | MSW intercepts at HTTP; for low-level network errors, use `HttpResponse.error()` or simulate via the test framework. | The two are different layers; MSW handles HTTP, lower errors need other tooling. |
| Mocking the same endpoint in browser AND node setups separately | Drift; bug fix in one is missed in the other. | Single `handlers.js` consumed by both `setupWorker` and `setupServer`. |
| Including MSW in the production bundle                    | Bloat; possibly leaks mocks to real users.                         | Tree-shake by importing only in `process.env.NODE_ENV !== 'production'` branches; never `import { worker }` at top level. |

## Limitations

- **Service Worker scope.** Browser MSW only intercepts requests
  from the same origin / path scope as the worker registration.
  Cross-origin requests need explicit handler URLs.
- **Streaming responses.** SSE / chunked responses work but are
  more delicate than JSON; consult MSW docs for the streaming API.
- **No native scenario state.** Stateful workflows ("after POST,
  GET returns the new item") need to manage state in your handlers
  manually (e.g. with a closure-scoped variable).

## References

- [msw-getting-started][gs] - install, handler authoring, browser
  vs node setup, lifecycle hooks, `server.use()` per-test overrides.
- MSW Docs - https://mswjs.io/docs/
- [`wiremock-stubs`](../wiremock-stubs/SKILL.md) - JVM counterpart.
- [`mountebank-imposters`](../mountebank-imposters/SKILL.md) - 
  multi-protocol alternative.
