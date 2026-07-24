---
name: cloudflare-workers-miniflare
description: "Wraps Miniflare 3 (the official Cloudflare Workers simulator) and Wrangler dev for testing Workers locally. Covers Miniflare's getMiniflare() programmatic API (workerd-backed simulation matching prod), the wrangler dev local-mode (live-reload during dev), KV / Durable Objects / R2 / D1 bindings emulation, and Vitest + @cloudflare/vitest-pool-workers for in-process tests. Use when testing Cloudflare Workers code locally."
---

# cloudflare-workers-miniflare

## Overview

Miniflare 3 is the official Workers simulator. Per
[developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/testing/miniflare/),
Miniflare 3 is built on top of `workerd` - the same runtime that
serves production Workers traffic. This means local-mode
behaviour matches prod with very high fidelity.

Three integration patterns:

1. **`wrangler dev`** (CLI; live-reload during dev).
2. **Programmatic Miniflare** (`getMiniflare()`; for integration
   tests).
3. **`@cloudflare/vitest-pool-workers`** (Vitest + in-process
   Workers; the recommended unit-test path).

## When to use

- Unit / integration tests for Cloudflare Workers code.
- Tests for KV / Durable Objects / R2 / D1 bindings.
- Local-development of Workers without deploying.

## Authoring

### Install

```bash
npm install --save-dev wrangler miniflare @cloudflare/vitest-pool-workers vitest
```

### wrangler dev (CLI)

```bash
wrangler dev --local        # workerd locally; no remote calls
wrangler dev                # default = local-mode in Wrangler 3+
```

Now `curl http://localhost:8787` hits the local Worker.

### Programmatic Miniflare

Per [miniflare.dev](https://miniflare.dev/):

```typescript
import { Miniflare } from 'miniflare';

const mf = new Miniflare({
  scriptPath: './src/worker.js',
  modules: true,
  kvNamespaces: ['MY_KV'],
  d1Databases: ['DB'],
  r2Buckets: ['MY_BUCKET'],
  durableObjects: {
    COUNTER: 'Counter',
  },
});

const res = await mf.dispatchFetch('https://example.com/');
expect(res.status).toBe(200);
expect(await res.text()).toBe('Hello');

await mf.dispose();
```

### @cloudflare/vitest-pool-workers (recommended for unit tests)

Per [developers.cloudflare.com/workers/testing/vitest-integration](https://developers.cloudflare.com/workers/testing/vitest-integration/):

```typescript
// vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});

// src/worker.test.ts
import { env, SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';

test('responds with hello', async () => {
  const response = await SELF.fetch('https://example.com/');
  expect(await response.text()).toBe('Hello');
});

test('writes to KV', async () => {
  await env.MY_KV.put('key', 'value');
  expect(await env.MY_KV.get('key')).toBe('value');
});
```

This is the **lowest-overhead** test path - runs inside workerd.

### Durable Objects testing

```typescript
import { env } from 'cloudflare:test';

test('counter increments', async () => {
  const id = env.COUNTER.idFromName('test');
  const stub = env.COUNTER.get(id);
  const r1 = await stub.fetch('https://example.com/increment');
  expect(await r1.text()).toBe('1');
  const r2 = await stub.fetch('https://example.com/increment');
  expect(await r2.text()).toBe('2');
});
```

Per Cloudflare docs, the vitest-pool-workers `env` exposes the
Durable Object namespace exactly as in production.

### D1 testing

```typescript
import { env } from 'cloudflare:test';

test('d1 query', async () => {
  await env.DB.exec('CREATE TABLE IF NOT EXISTS users (id INT, name TEXT)');
  await env.DB.prepare('INSERT INTO users VALUES (?, ?)').bind(1, 'alice').run();
  const { results } = await env.DB.prepare('SELECT * FROM users').all();
  expect(results).toEqual([{ id: 1, name: 'alice' }]);
});
```

## Running

```bash
npx vitest run                # @cloudflare/vitest-pool-workers
wrangler dev                  # CLI dev
```

## CI integration

```yaml
jobs:
  workers-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx vitest run
```

No CF account/API key needed - `vitest-pool-workers` runs
locally via workerd.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test against deployed Worker | Slow; flaky; rate-limited | Use vitest-pool-workers |
| Mock the fetch API | Loses Workers' standard-Web-Platform shape | Use real Worker isolation |
| Skip Durable Object tests | Fan-out + consistency bugs hide | Test DO classes directly |
| KV `getWithMetadata` not tested for stale-read behavior | KV is eventually consistent | Test the consistency requirements |
| Local-mode time differs from prod | Cron / scheduled triggers won't fire | Test via deployed Worker + Cloudflare Cron Trigger |
| Hardcoded API key in worker | Exposed in source map / fetch | Use Workers Secrets (wrangler secret) |
| No assertion on response headers | Cache-Control / CORS bugs | Inspect response.headers |
| Cold-start tests against local Worker | Local cold start ~0ms; not representative | Per `cold-start-budget-reference`, test cold-start budget on deployed Worker |

## Limitations

- **Workerd local-mode mirrors prod with ~95% fidelity.** Edge-
  cases around network egress, KV durability, R2 ranges may
  differ. Test against staging for high-fidelity.
- **No production analytics in local-mode.** Workers Analytics
  Engine writes are no-ops locally.
- **Bindings to remote services** (e.g., remote KV from a
  different account) need explicit `remote: true` config in
  Wrangler 3.
- **Cron Triggers don't fire locally.** Schedule events need
  manual `dispatchFetch('https://example.com/__scheduled')`.
- **WebSocket Hibernation** (Durable Objects) has subtleties in
  local mode; verify against deployed.

## References

- Miniflare 3 docs:
  [developers.cloudflare.com/workers/testing/miniflare/](https://developers.cloudflare.com/workers/testing/miniflare/).
- Wrangler dev:
  [developers.cloudflare.com/workers/wrangler/commands/#dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev).
- vitest-pool-workers:
  [developers.cloudflare.com/workers/testing/vitest-integration](https://developers.cloudflare.com/workers/testing/vitest-integration/).
- Cloudflare Workers runtime overview:
  [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/).
- Companion catalog:
  `cold-start-budget-reference`.
- Sibling Edge runtime:
  `vercel-edge-runtime-testing`.
- Other serverless tools:
  `aws-sam-local-testing`,
  `netlify-functions-tests`.
