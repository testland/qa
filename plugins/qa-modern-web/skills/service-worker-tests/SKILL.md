---
name: service-worker-tests
description: "Test service workers with Playwright (`context.serviceWorkers()` + `waitForEvent('serviceworker')`) and unit tests via `service-worker-mock`. Covers the MV3 service-worker lifecycle (~30s suspend), cache strategies (cache-first, network-first, stale-while-revalidate), and `evaluate()` continuity across worker restart. Use when a site registers a service worker and its caching / offline behavior is uncovered, or users report stale content surviving a deploy; for the install / add-to-homescreen flow use pwa-install-flow-tests, and to design (not test) the caching policy use sw-cache-strategy-author."
metadata:
  keywords: "service-worker, playwright, pwa, offline-testing, cache-strategy"
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

## How to use

1. Launch a **persistent** context so the worker registers (incognito-default contexts skip SW registration) and `await waitForEvent('serviceworker')` before asserting - see Setup.
2. Assert one lifecycle or offline behavior end to end - see Worked example.
3. Inspect worker state (`SW_VERSION`, cache keys) with `serviceWorker.evaluate()`, which survives MV3's ~30s suspend.
4. Cover the caching contract: cache-first hits and network-first offline fallback (see Cache strategies).
5. For version-bump cache invalidation, `service-worker-mock` unit tests, and push-subscription tests, see [references/advanced-service-worker-tests.md](references/advanced-service-worker-tests.md).

## Setup - Playwright persistent context

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

## Worked example - offline fallback end to end

One test that registers the worker, drops the network, and asserts the
network-first fallback renders - the smallest complete offline check:

```ts
test('registered SW serves the offline page when network drops', async () => {
  const context = await chromium.launchPersistentContext('/tmp/sw-offline', {
    headless: false,
  });
  const page = await context.newPage();

  // 1. Load online so the SW installs and pre-caches
  await page.goto('https://localhost:3000');
  let [sw] = context.serviceWorkers();
  sw ??= await context.waitForEvent('serviceworker');
  expect(sw.url()).toContain('/sw.js');
  await page.waitForLoadState('networkidle');

  // 2. Drop the network and reload
  await context.setOffline(true);
  await page.reload();

  // 3. The SW's offline fallback answers instead of a network error
  await expect(page.locator('text=You are offline')).toBeVisible();

  await context.close();
});
```

## Evaluate in the worker context

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

## Cache strategies

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test SW with `chromium.launch()` (incognito) | SWs don't register in incognito-by-default contexts | Use `launchPersistentContext` (Setup) |
| Skip `waitForEvent('serviceworker')` | Race condition - `serviceWorkers()` returns empty before registration | Always `await` the event (Setup) |
| Reuse user-data-dir across test runs | Stale SW from prior run answers requests | Fresh `userDataDir` per test (Setup) |
| Test offline by killing dev server | SW caches still serve from network until `setOffline(true)` | Use `context.setOffline(true)` (Worked example) |
| Forget to grant notifications permission | `pushManager.subscribe` rejects silently | `context.grantPermissions(['notifications'])` (see references) |

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
  `context.serviceWorkers()`, MV3 lifecycle behavior.
- [references/advanced-service-worker-tests.md](references/advanced-service-worker-tests.md) -
  version-bump cache invalidation, `service-worker-mock` unit tests,
  push-subscription tests.

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
