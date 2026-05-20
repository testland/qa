---
name: netlify-functions-test
description: "Wraps Netlify Functions testing patterns: Netlify Dev (`netlify dev`) for local routing emulation, the @netlify/functions handler API testing pattern, Netlify Edge Functions (Deno runtime) vs Background Functions (Lambda under the hood) distinction, and scheduled-function (cron) test patterns. Use when testing Netlify Functions or Edge Functions. Composes cold-start-budget-reference + lambda-timeout-budget-reference."
rating: 21
d6: 4
archetype: S1
---

# netlify-functions-test

## Overview

Netlify Functions come in three flavors:

1. **Standard Functions** — Node/Go, Lambda under the hood,
   10s default timeout (background functions get 15min)
2. **Background Functions** — async Lambda, 15min max
3. **Edge Functions** — Deno runtime, 30s timeout

Per [docs.netlify.com/functions](https://docs.netlify.com/functions/overview/),
the local emulator (`netlify dev`) runs all three.

## When to use

- Tests for Netlify Functions (any flavor).
- Local routing emulation matching prod redirects + headers.
- Edge Functions testing (Deno-runtime constraints).

## Authoring

### Install

```bash
npm install -g netlify-cli
npm install --save-dev @netlify/functions @netlify/edge-functions
```

### Standard Function

```typescript
// netlify/functions/hello.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello' }),
  };
};
```

### Test the handler directly

```typescript
import { handler } from '../netlify/functions/hello';

test('hello returns 200', async () => {
  const event: any = {
    httpMethod: 'GET',
    path: '/.netlify/functions/hello',
    headers: {},
    queryStringParameters: {},
    body: null,
  };
  const result = await handler(event, {} as any, () => {});
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({ message: 'Hello' });
});
```

### netlify dev (local routing)

```bash
netlify dev --port 8888
```

Now `curl http://localhost:8888/.netlify/functions/hello` hits
the function exactly as on netlify.app. Redirects + rewrites
defined in `netlify.toml` are honored.

### Background Functions (long-running)

Per [docs.netlify.com](https://docs.netlify.com/functions/background-functions/):
filename must end in `-background.ts`:

```typescript
// netlify/functions/process-background.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // 15min budget per lambda-timeout-budget-reference
  await doLongRunningWork(event.body);
  return { statusCode: 200 };
};
```

These return 202 immediately to the caller; work continues in
the background.

### Edge Functions (Deno)

Per [docs.netlify.com/edge-functions](https://docs.netlify.com/edge-functions/overview/):

```typescript
// netlify/edge-functions/middleware.ts
import type { Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  return new Response('Hello from Edge', {
    headers: { 'content-type': 'text/plain' },
  });
};
```

Test with `deno test` or via `netlify dev` (which spins up
the Deno runtime).

### Scheduled (cron) Functions

```typescript
// netlify/functions/cleanup.ts
import type { Config } from '@netlify/functions';

export const handler = async () => {
  await doCleanup();
  return { statusCode: 200 };
};

export const config: Config = {
  schedule: '@daily',  // cron expression also accepted
};
```

Test by invoking the handler directly; the schedule itself is
Netlify-platform-driven.

## Running

```bash
npx jest                  # Handler-direct tests
netlify dev               # Full local emulator
```

## CI integration

```yaml
jobs:
  netlify-functions-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx jest
```

For deployed-function smoke tests, use the
`netlify deploy --build --dir=public` then run against the
preview URL.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Standard Function with > 10s work | Netlify times out at 10s by default | Use Background Function (15min) |
| Test handler with empty event object | Handler reads `event.headers` / `event.body` → crash | Provide a complete event |
| Edge Function importing Node modules | Deno runtime; fails | Use Deno-compatible imports (npm: + jsr: specifiers) |
| Skip `netlify dev` for routing tests | Misses redirects + rewrites | Always use `netlify dev` for routing |
| Background Function with sync response expectation | Returns 202 immediately; caller's "await result" gets nothing | Use async return pattern |
| Hardcoded function path in tests | Netlify paths are `/.netlify/functions/{name}`; client paths via redirect | Use the rewrite target |
| Scheduled-function test that asserts on the schedule itself | The schedule is platform-controlled | Test handler invocation; trust the schedule |

## Limitations

- **Edge Functions run on Deno; standard ones on Node.** Different
  module systems; different stdlib.
- **Background Functions return 202 not the actual response.**
  Callers must poll a status endpoint or webhook.
- **`netlify dev` may differ from prod** in subtle areas
  (geo headers, IP-based context).
- **Cold-start budget per [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md).**
  Standard Functions: ~300ms-2s (Lambda-equivalent).
- **No A/B-testing primitives.** Use other tools (LD / Statsig /
  GrowthBook).

## References

- Netlify Functions docs:
  [docs.netlify.com/functions/overview/](https://docs.netlify.com/functions/overview/).
- Netlify Edge Functions:
  [docs.netlify.com/edge-functions/overview/](https://docs.netlify.com/edge-functions/overview/).
- Netlify Dev:
  [docs.netlify.com/cli/get-started/](https://docs.netlify.com/cli/get-started/).
- Background Functions:
  [docs.netlify.com/functions/background-functions/](https://docs.netlify.com/functions/background-functions/).
- Companion catalogs:
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md),
  [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md).
- Sibling tools:
  [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md),
  [`cloudflare-workers-miniflare`](../cloudflare-workers-miniflare/SKILL.md),
  [`vercel-edge-runtime-testing`](../vercel-edge-runtime-testing/SKILL.md).
