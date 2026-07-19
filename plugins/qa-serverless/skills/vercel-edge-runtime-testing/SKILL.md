---
name: vercel-edge-runtime-testing
description: "Wraps Vercel Edge Runtime testing patterns: the @edge-runtime/jest-environment + edge-runtime CLI for executing Web-Standard APIs (Request / Response / fetch) in jest tests, the `vercel dev` local emulator for full route testing, and the Edge vs Node Function divergence (no fs, no Buffer; Request / Response only). Covers the 30s Edge function timeout per vercel.com/docs. Use when testing Vercel Edge Functions or middleware."
---

# vercel-edge-runtime-testing

## Overview

Vercel Edge Runtime is V8-isolate-based (sub-30ms cold starts
per [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md))
with a constrained API surface - Web Platform standards only
(no Node `fs`, `Buffer`, `child_process`). Per
[vercel.com/docs/functions/edge-runtime](https://vercel.com/docs/functions/edge-runtime):
"The Edge Runtime is a strict subset of Web standard APIs."

Tests need the same constraints. Vercel ships
`@edge-runtime/jest-environment` (and standalone `edge-runtime`
CLI) for this.

## When to use

- Unit tests for Vercel Edge Functions or middleware.
- Tests for code that uses only Web Platform APIs (intentional
  Edge target).
- Routing / middleware tests with `vercel dev` integration.

## Authoring

### Install

```bash
npm install --save-dev @edge-runtime/jest-environment edge-runtime
```

### Jest config

```json
{
  "jest": {
    "testEnvironment": "@edge-runtime/jest-environment"
  }
}
```

This swaps Jest's default `jsdom` / `node` env for an Edge-
constrained one. Tests that try to import `fs` or use `Buffer`
fail - same as production.

### Edge function example

```typescript
// pages/api/hello.ts (Vercel Edge Function)
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Test the handler

```typescript
import handler from './hello';

test('returns ok', async () => {
  const req = new Request('https://example.com/api/hello');
  const res = await handler(req);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
```

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!request.cookies.get('session')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}
```

### Test middleware

```typescript
import { middleware } from './middleware';

test('redirects unauthenticated /admin', () => {
  const request = new Request('https://example.com/admin/dashboard');
  const response = middleware(request as any);
  expect(response.status).toBe(307);  // redirect
  expect(response.headers.get('location')).toContain('/login');
});

test('allows authenticated', () => {
  const request = new Request('https://example.com/admin', {
    headers: { cookie: 'session=valid' },
  });
  const response = middleware(request as any);
  expect(response.headers.get('x-middleware-next')).toBe('1');  // NextResponse.next sentinel
});
```

### vercel dev (CLI)

```bash
npm install -g vercel
vercel dev --listen 3000
```

Routes are served exactly as on prod. Now run e2e tests against
`http://localhost:3000`.

### edge-runtime CLI for ad-hoc

```bash
npx edge-runtime ./pages/api/hello.ts
# Spins up a local server in the Edge Runtime environment
```

## Running

```bash
npx jest
```

## CI integration

```yaml
jobs:
  vercel-edge-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx jest
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `jsdom` test env for Edge code | Tests pass; `Buffer.from(...)` works in test but not prod | Use `@edge-runtime/jest-environment` |
| Importing `fs` / `Buffer` in handler | Tests fail (good); but production fails too | Use Web Platform APIs (Uint8Array, TextEncoder) |
| Hardcoded path in test | OS-specific | Use Request URL |
| Skipping middleware tests | Auth bypass slips through | Always test middleware separately |
| No 30s timeout test | Edge functions have 30s wall-clock max per [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md) | Test with artificial slowness; assert proper response |
| Mocking `Request` / `Response` | Loses standard-compliance | Use real Request / Response (Edge env provides them) |
| Skip `vercel dev` for route-tests | Misses routing layer | Run e2e against `vercel dev` |

## Limitations

- **30 second hard timeout.** Per
  [vercel.com/docs/functions/edge-runtime](https://vercel.com/docs/functions/edge-runtime),
  Edge Functions are killed at 30s. No grace.
- **Streaming responses can extend** beyond 30s for the body
  but headers must commit early.
- **Cold-start budget different** per
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md).
- **No Node-specific dependencies.** Edge can't run Node-only
  packages. Pair with Node Functions for those.
- **Doesn't test the Vercel CDN layer.** Caching / rewrites /
  redirects above the function are CDN-level.

## References

- Vercel Edge Runtime:
  [vercel.com/docs/functions/edge-runtime](https://vercel.com/docs/functions/edge-runtime).
- edge-runtime package:
  [github.com/vercel/edge-runtime](https://github.com/vercel/edge-runtime).
- @edge-runtime/jest-environment:
  [npmjs.com/package/@edge-runtime/jest-environment](https://www.npmjs.com/package/@edge-runtime/jest-environment).
- Next.js middleware:
  [nextjs.org/docs/app/building-your-application/routing/middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware).
- Companion catalogs:
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md),
  [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md).
- Sibling Edge runtime:
  [`cloudflare-workers-miniflare`](../cloudflare-workers-miniflare/SKILL.md).
