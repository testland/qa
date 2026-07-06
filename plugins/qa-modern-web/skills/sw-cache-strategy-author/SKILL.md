---
name: sw-cache-strategy-author
description: "Author service worker cache strategies (cache-first, network-first, stale-while-revalidate, cache-only, network-only) per Workbox conventions, plus generate the matching Playwright assertions to lock the strategy in. Avoids the common \"cached forever\" pitfall by enforcing TTL + version-bump invalidation."
type: skill
keywords:
  - service-worker
  - cache-strategy
  - workbox
  - offline-first
  - pwa
---

# sw-cache-strategy-author

Authors strategy code (Workbox-compatible) + the matching
`service-worker-tests` assertions in one workflow. Pairs with the
`service-worker-tests` skill (testing) and `pwa-install-flow-tests`
skill (install-time prerequisites).

## When to use

- Designing offline behavior for a new PWA route.
- Migrating from a hand-rolled SW to Workbox-style strategies.
- Auditing an existing SW that "caches everything forever" - pick
  strategies per route type with TTL + invalidation.

## Step 1 - Pick strategy per route type

| Route type | Strategy | Why |
|---|---|---|
| Static immutable (`/_next/static/`, hashed filenames) | **CacheFirst** with long TTL | Filename change = cache key change; safe forever |
| HTML shell (`/`, `/about`) | **NetworkFirst** with timeout fallback | Always try network for fresh content; fallback to cache offline |
| API responses (`/api/...`) | **StaleWhileRevalidate** | Show cached now; refresh in background |
| User-specific data (`/api/user/me`) | **NetworkOnly** | Privacy; never cache |
| Manifest, robots.txt | **NetworkOnly** | Always reflect deploy state |
| Images (`/img/*`) | **CacheFirst** with TTL | Bandwidth win; expire weekly |
| 3rd-party fonts | **CacheFirst** with long TTL | License-permitting |

## Step 2 - Author Workbox-style strategy

```js
// sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const SW_VERSION = 'v3';

precacheAndRoute(self.__WB_MANIFEST);

// Static immutable
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: `static-${SW_VERSION}`,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// HTML shell
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: `html-${SW_VERSION}`,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/user/'),
  new StaleWhileRevalidate({
    cacheName: `api-${SW_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }),
    ],
  })
);

// User data - never cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/user/'),
  new NetworkOnly()
);

// Cleanup old SW versions on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(`-${SW_VERSION}`))
          .map((k) => caches.delete(k))
      )
    )
  );
});
```

## Step 3 - Generate matching Playwright tests

For each registered route, emit one test asserting the strategy
behavior. Pattern:

```ts
// Tests for sw.js routes - paired with sw-cache-strategy-author Step 2
import { test, expect } from '@playwright/test';

test.describe('SW cache strategies', () => {
  test('static assets: cache-first (offline still serves)', async ({ page, context }) => {
    await page.goto('https://localhost:3000');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    const resp = await page.evaluate(() =>
      fetch('/_next/static/abc123.css').then(r => r.status)
    );
    expect(resp).toBe(200);
  });

  test('HTML shell: network-first (fresh while online)', async ({ page }) => {
    let networkHits = 0;
    page.on('request', req => {
      if (req.url().endsWith('/about') && req.resourceType() === 'document') {
        networkHits++;
      }
    });

    await page.goto('https://localhost:3000/about');
    await page.goto('https://localhost:3000/');
    await page.goto('https://localhost:3000/about');

    expect(networkHits).toBeGreaterThanOrEqual(2);
  });

  test('user API: never cached', async ({ page, context }) => {
    await page.goto('https://localhost:3000');
    await page.evaluate(() => fetch('/api/user/me'));
    await page.waitForTimeout(100);

    let [sw] = context.serviceWorkers();
    const userCache = await sw.evaluate(async () => {
      const cache = await caches.open('api-v3');
      const reqs = await cache.keys();
      return reqs.map(r => r.url);
    });
    expect(userCache).not.toContain(expect.stringContaining('/api/user/'));
  });

  test('SW v3 deletes v2 caches on activate', async ({ context, page }) => {
    await page.goto('https://localhost:3000');
    let [sw] = context.serviceWorkers();
    const cacheNames = await sw.evaluate(() => caches.keys());

    expect(cacheNames.every((n: string) => n.endsWith('-v3'))).toBe(true);
  });
});
```

## Step 4 - Audit existing SW

For each `caches.match` / `event.respondWith` block in an existing
SW, classify:

| Existing pattern | Likely category | Migration |
|---|---|---|
| `caches.match(req).then(r => r ?? fetch(req))` | CacheFirst (no TTL) | Add `ExpirationPlugin` |
| `fetch(req).catch(() => caches.match(req))` | NetworkFirst (no timeout) | Add `networkTimeoutSeconds` |
| `caches.match(req)` only | CacheOnly (dangerous for HTML) | Verify intentional |
| Hand-rolled SWR (parallel fetch + cache.put) | StaleWhileRevalidate | Replace with Workbox class |

## Step 5 - Lock invalidation strategy

Bumping `SW_VERSION` is the most reliable invalidation, but breaks
revalidation for users with stale tabs. Pair with:

- Trigger `skipWaiting()` only after user opt-in (banner: "New
  version available - refresh").
- For HTML shell, prefer NetworkFirst with `networkTimeoutSeconds: 3`
  over CacheFirst (so users see updated UI as soon as network allows).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| CacheFirst without TTL | Stale forever; users on stale UI for weeks | Always `ExpirationPlugin` (Step 2) |
| Cache POST/PUT/DELETE responses | Side effects replayed; data corruption | Strategies only match GET by default; verify in fetch handler |
| Cache `Set-Cookie` responses | Cross-user cookie leak | `CacheableResponsePlugin({ statuses: [200] })` excludes; never cache user-specific |
| Auto skipWaiting on every deploy | Users mid-form lose state | Require user opt-in (Step 5) |
| One cache name "app-cache" forever | Old assets stay forever | Version per release (Step 2 SW_VERSION) |

## Limitations

- Workbox v7+ requires bundling (Vite/webpack/Rollup); CDN-served
  SW patterns are limited.
- Some browsers (Firefox) have stricter SW cache quota; test the
  worst-case browser for your audience.
- This skill is JS/TS-first; no equivalent for Dart/Flutter PWA SWs.

## References

- [Workbox docs](https://developer.chrome.com/docs/workbox) - 
  authoritative API + plugin reference (consult for current
  ExpirationPlugin / CacheableResponsePlugin signatures)
- [`service-worker-tests`](../service-worker-tests/SKILL.md) - 
  sister skill providing Playwright SW lifecycle test patterns
