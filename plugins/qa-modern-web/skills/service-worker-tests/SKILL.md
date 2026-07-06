---
name: service-worker-tests
description: "Test service workers with Playwright (`context.serviceWorkers()` + `waitForEvent('serviceworker')`) and unit tests using `service-worker-mock`. Covers MV3 service worker lifecycle (~30s suspend), cache strategies (cache-first, network-first, stale-while-revalidate), and `evaluate()` continuity across worker restart."
type: skill
keywords:
  - service-worker
  - playwright
  - pwa
  - offline-testing
  - cache-strategy
---

# service-worker-tests

Service workers are the heart of offline-capable PWAs and Chrome
extension MV3 background scripts. Per the [Playwright Chrome
extensions docs], Playwright accesses service workers via
`context.serviceWorkers()` and persists `Worker` objects across MV3's
~30s auto-suspend.

## When to use

- Testing offline-first behavior (cache-first responses, queue
  requests during offline).
- Validating cache invalidation on service worker version bump.
- Testing message passing between page and service worker.
- Verifying push notification subscription registration.

## Step 1 - Playwright setup with persistent context

```ts
import { test, expect, chromium } from '@playwright/test';

test('service worker registers on first load', async () => {
  const userDataDir = '/tmp/test-user-data';
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // needed for SW registration in some Chromium versions
  });

  const page = await context.newPage();
  await page.goto('https://localhost:3000');

  // Wait for the SW to register
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  expect(serviceWorker.url()).toContain('/sw.js');
  await context.close();
});
```

Per [Playwright Chrome extensions docs], the same `context.serviceWorkers()`
pattern applies to PWA service workers (not just extensions).

## Step 2 - Evaluate code in worker context

```ts
const swVersion = await serviceWorker.evaluate(() => {
  return self.SW_VERSION;
});
expect(swVersion).toBe('1.4.2');

// Inspect cache contents
const cachedUrls = await serviceWorker.evaluate(async () => {
  const cache = await caches.open('app-v1');
  const reqs = await cache.keys();
  return reqs.map(r => r.url);
});
expect(cachedUrls).toContain('https://localhost:3000/manifest.json');
```

`evaluate()` proxies through the worker's JS context. Per
[Playwright Chrome extensions docs], Playwright keeps the same Worker
object alive across MV3 auto-suspend (~30s) - `evaluate()` calls
continue transparently after restart.

## Step 3 - Test cache strategies

Cache-first:

```ts
test('cache-first returns from cache, no network', async ({ page }) => {
  await page.goto('https://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Block network to force cache hits
  await page.route('**/static/**', route => route.abort('failed'));
  await page.reload();

  // Page still renders from SW cache
  await expect(page.locator('h1')).toBeVisible();
});
```

Network-first with offline fallback:

```ts
test('network-first falls back to offline page', async ({ page, context }) => {
  await page.goto('https://localhost:3000');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('text=You are offline')).toBeVisible();
});
```

## Step 4 - Test version bump + cache invalidation

```ts
test('SW v2 deletes v1 caches on activate', async ({ context, page }) => {
  await page.goto('https://localhost:3000');
  let sw = context.serviceWorkers()[0]
        ?? await context.waitForEvent('serviceworker');

  const v1Caches = await sw.evaluate(() => caches.keys());
  expect(v1Caches).toContain('app-v1');

  // Trigger SW update (deploy v2 to test server)
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r?.update()));

  // Wait for activation
  await page.waitForFunction(() =>
    navigator.serviceWorker.controller?.scriptURL.includes('v2')
  );

  const v2Caches = await sw.evaluate(() => caches.keys());
  expect(v2Caches).toContain('app-v2');
  expect(v2Caches).not.toContain('app-v1');
});
```

## Step 5 - Unit test the SW with `service-worker-mock`

For Jest/Vitest unit tests that don't need a browser:

```bash
npm install --save-dev service-worker-mock
```

```ts
import makeServiceWorkerEnv from 'service-worker-mock';

beforeEach(() => {
  Object.assign(global, makeServiceWorkerEnv());
  jest.resetModules();
});

test('install event opens cache and pre-caches assets', async () => {
  await import('../src/sw.js');
  await self.trigger('install');

  expect(self.snapshot().caches['app-v1']).toBeDefined();
  expect(self.snapshot().caches['app-v1']['/index.html']).toBeDefined();
});
```

## Step 6 - Push notification subscription test

```ts
test('push subscription created on registration', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('https://localhost:3000');

  const subscription = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: '<base64-vapid-key>',
    });
  });
  expect(subscription).toBeDefined();
});
```

Pair with the testland-qa `qa-notifications/push-notification-test-author`
skill for downstream send/receive assertions.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test SW with `chromium.launch()` (incognito) | SWs don't register in incognito-by-default contexts | Use `launchPersistentContext` (Step 1) |
| Skip `waitForEvent('serviceworker')` | Race condition - `serviceWorkers()` returns empty before registration | Always `await` the event (Step 1) |
| Reuse user-data-dir across test runs | Stale SW from prior run answers requests | Fresh `userDataDir` per test (Step 1) |
| Test offline by killing dev server | SW caches still serve from network until `setOffline(true)` | Use `context.setOffline(true)` (Step 3) |
| Forget to grant notifications permission | `pushManager.subscribe` rejects silently | `context.grantPermissions(['notifications'])` (Step 6) |

## Limitations

- WebKit (Safari) and Firefox have different SW APIs; this skill
  targets Chromium-channel testing primarily.
- Playwright service worker support is documented as
  experimental-stable; check current API status at the
  [Playwright Chrome extensions docs] for breaking changes.
- `service-worker-mock` does not implement all Workbox APIs - for
  Workbox-using SWs, integration tests via Playwright are required.

## References

- [Playwright Chrome extensions docs] - `launchPersistentContext`,
  `context.serviceWorkers()`, MV3 lifecycle behavior

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
