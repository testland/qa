---
name: workbox-tests
description: "Test Workbox-built service workers — pin behavior of the named recipes (`pageCache`, `staticResourceCache`, `imageCache`, `googleFontsCache`, `offlineFallback`, `warmStrategyCache`) per [developer.chrome.com/docs/workbox/modules/workbox-recipes][wb-recipes]; validate `workbox-precaching` manifest injection (`__WB_MANIFEST` revisioning); assert `workbox-routing` route handler matches; assert `workbox-expiration` and `workbox-cacheable-response` plugin gates; and verify the `workbox-window` registration helper events (`installed`, `waiting`, `controlling`, `activated`). For generic service-worker tests, install-flow tests, and SW cache-strategy authoring see `qa-modern-web/service-worker-tests`, `pwa-install-flow-tests`, and `sw-cache-strategy-author`. For channel-agnostic push-notification harness see `qa-notifications/push-notification-test-author`. This plugin covers Workbox recipes, offline-fallback patterns, Lighthouse PWA audit interpretation, and web-push subscription lifecycle."
rating: 23
d6: 4
archetype: S1
keywords:
  - workbox
  - workbox-recipes
  - workbox-window
  - precaching
  - service-worker
---

# workbox-tests

## Overview

Workbox is "Production-ready service worker libraries and tooling"
per [developer.chrome.com/docs/workbox][wb-overview]. It distributes
as a set of focused packages: `workbox-precaching` for build-time
manifest injection, `workbox-routing` + `workbox-strategies` for
runtime caching, `workbox-recipes` for the canonical five-line
patterns, and `workbox-window` for the page-side registration helper
per [developer.chrome.com/docs/workbox/modules][wb-modules]. This
skill tests Workbox-built service workers — distinct from the
[`sw-cache-strategy-author`](../../../qa-modern-web/skills/sw-cache-strategy-author/SKILL.md)
skill which *authors* the strategies. Here we assert that an
already-shipped Workbox SW behaves the way its recipes claim.

The current Workbox release line at time of authoring is **v7.4.1**
per [github.com/GoogleChrome/workbox][wb-gh] (released May 2026).

[wb-overview]: https://developer.chrome.com/docs/workbox
[wb-modules]: https://developer.chrome.com/docs/workbox/modules
[wb-recipes]: https://developer.chrome.com/docs/workbox/modules/workbox-recipes
[wb-gh]: https://github.com/GoogleChrome/workbox

## When to use

- A PWA already uses Workbox and tests need to lock its behavior
  against future refactors.
- Migrating from Workbox v6 → v7 — assert each recipe behaves the
  same on the new release.
- A "stale forever" bug report — pin the `workbox-expiration`
  plugin's TTL with a test before patching.
- A `workbox-precaching` injection drifted (build emits wrong
  `__WB_MANIFEST`) — assert the precache manifest shape in CI.

## Authoring

### Step 1 — Install test dependencies

Workbox ships no first-party test runner; the canonical pairing is
Playwright (for runtime SW assertions) plus a unit-test runner
(Vitest or Jest) for the `workbox-window` page-side helper:

```bash
npm install --save-dev @playwright/test vitest
# Workbox itself is already a runtime dep at this point
```

### Step 2 — Decide where each assertion lives

| Subject | Runner | Why |
|---|---|---|
| Precache manifest shape (`__WB_MANIFEST`) | Vitest reading the built `sw.js` artifact | Static; no browser needed |
| Recipe behavior at runtime (`pageCache`, `imageCache`) | Playwright | Needs a real `caches` API + fetch interception |
| `workbox-window` events on the page | Playwright (page side) | Listens on `wb.addEventListener(...)` from page code |
| Plugin TTL / quota (`workbox-expiration`) | Playwright with clock manipulation | Needs the SW to actually call the plugin's pruning logic |

### Step 3 — Author the precache-manifest static assertion

```ts
// tests/precache-manifest.spec.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('workbox-precaching manifest', () => {
  it('emits the __WB_MANIFEST entries with revision strings', () => {
    const sw = readFileSync('./dist/sw.js', 'utf8');
    // workbox-precaching tokens; per wb-modules
    expect(sw).toMatch(/precacheAndRoute\s*\(/);
    // Build-tool injects __WB_MANIFEST as an array of { url, revision } records
    const manifest = sw.match(/self\.__WB_MANIFEST\s*=\s*(\[[^;]+\])/)?.[1];
    expect(manifest).toBeDefined();
    const entries = JSON.parse(manifest!);
    expect(Array.isArray(entries)).toBe(true);
    for (const entry of entries) {
      expect(typeof entry.url).toBe('string');
      // Hashed filenames carry revision: null; non-hashed must have a revision string
      const isHashed = /\.[a-f0-9]{8,}\./.test(entry.url);
      if (!isHashed) expect(typeof entry.revision).toBe('string');
    }
  });
});
```

`precacheAndRoute()` is the entry point exported from
`workbox-precaching` per [wb-modules]: *"Easily precache a set of
files and efficiently manage updates to files."*

### Step 4 — Author per-recipe runtime tests

Per [wb-recipes], each named recipe has a documented default. Pin
those defaults with tests.

`pageCache()` — "respond to a request for an HTML page (through URL
navigation) with a network first caching strategy" with a default
3-second network timeout per [wb-recipes]:

```ts
import { test, expect } from '@playwright/test';

test('pageCache() falls back to cache when network exceeds 3s', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  // Slow the network past the 3s networkTimeoutSeconds default
  await context.route('**/*.html', async route => {
    await new Promise(r => setTimeout(r, 5_000));
    await route.continue();
  });

  await page.goto('https://localhost:3000/');
  // Cached shell should serve before the 5s slow network resolves
  await expect(page.locator('h1')).toBeVisible({ timeout: 4_500 });
});
```

`imageCache()` — "respond to a request for images with a cache-first
caching strategy" with "defaults of 60 maximum images cached for 30
days" per [wb-recipes]. Pin the 60-entry cap:

```ts
test('imageCache() applies the 60-entry default cap', async ({ context, page }) => {
  await page.goto('https://localhost:3000/gallery');
  await page.waitForLoadState('networkidle');

  // Force 61 distinct image requests
  for (let i = 0; i < 61; i++) {
    await page.evaluate((n) => fetch(`/img/test-${n}.png`).catch(() => {}), i);
  }

  // Wait for ExpirationPlugin to prune (it runs async)
  await page.waitForTimeout(500);

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const count = await sw.evaluate(async () => {
    const cacheName = (await caches.keys()).find(k => k.includes('image'));
    if (!cacheName) return 0;
    return (await (await caches.open(cacheName)).keys()).length;
  });
  expect(count).toBeLessThanOrEqual(60);
});
```

`offlineFallback()` — "serve a web page, image, or font if there's
a routing error" when users are offline per [wb-recipes], defaulting
to `offline.html`:

```ts
test('offlineFallback() serves offline.html on navigation failure', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/never-cached');
  expect(resp?.status()).toBe(200);
  await expect(page.locator('text=/offline/i')).toBeVisible();
});
```

The `offline.html` default name is per [wb-recipes] — if a project
overrides it via the `pageFallback` option, the test must match.

`googleFontsCache()` — uses "stale-while-revalidate for stylesheets
and cache-first for font files, with defaults of 30 font files
cached for one year" per [wb-recipes]:

```ts
test('googleFontsCache stylesheet uses stale-while-revalidate', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const status = await page.evaluate(() =>
    fetch('https://fonts.googleapis.com/css2?family=Inter').then(r => r.status).catch(() => 0)
  );
  // Stale cache must respond offline
  expect(status).toBe(200);
});
```

`staticResourceCache()` — "respond to CSS, JavaScript, and Web
Worker requests with a stale-while-revalidate strategy" per
[wb-recipes]:

```ts
test('staticResourceCache serves cached CSS offline', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);

  const status = await page.evaluate(() =>
    fetch('/styles/app.css').then(r => r.status).catch(() => 0)
  );
  expect(status).toBe(200);
});
```

`warmStrategyCache()` — "load provided URLs into your cache during
the service worker's install phase, caching them with the options
of the provided strategy" per [wb-recipes]. Pin which URLs are
warmed:

```ts
test('warmStrategyCache() warms the declared URL list on install', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  // SW install phase warms a known URL — pin it
  const warmed = await sw.evaluate(async () => {
    const names = await caches.keys();
    for (const n of names) {
      const cache = await caches.open(n);
      const keys = await cache.keys();
      if (keys.some(k => k.url.endsWith('/critical-data.json'))) return true;
    }
    return false;
  });
  expect(warmed).toBe(true);
});
```

### Step 5 — Author `workbox-window` event tests

`workbox-window` is the page-side companion that "helps with
registering a service worker, managing updates, and responding to
lifecycle events" per [wb-modules]. The events emitted are
`installed`, `waiting`, `controlling`, `activated`, and `redundant`.
Listen on each from the page context:

```ts
test('wb.addEventListener installed fires after register()', async ({ page }) => {
  await page.goto('https://localhost:3000/');

  const events = await page.evaluate(() => new Promise<string[]>((resolve) => {
    // @ts-expect-error workbox-window global from the page bundle
    const wb = new window.Workbox('/sw.js');
    const fired: string[] = [];
    wb.addEventListener('installed',   () => fired.push('installed'));
    wb.addEventListener('waiting',     () => fired.push('waiting'));
    wb.addEventListener('controlling', () => fired.push('controlling'));
    wb.addEventListener('activated',   () => fired.push('activated'));
    wb.register();
    setTimeout(() => resolve(fired), 3000);
  }));

  // First install fires installed + activated; waiting only fires on update with a controller already present
  expect(events).toContain('installed');
  expect(events).toContain('activated');
});
```

The five-event vocabulary is enumerated in [wb-modules] under
`workbox-window`.

### Step 6 — Test the cacheable-response plugin gate

Per [wb-modules], `workbox-cacheable-response` "restrict[s] which
requests are cached based on a response's status code or headers."
A common configuration restricts to `statuses: [200]`. Assert that
a 404 is not cached:

```ts
test('CacheableResponsePlugin excludes non-200 from cache', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');
  await page.evaluate(() => fetch('/api/known-404').catch(() => {}));
  await page.waitForTimeout(300);

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const cachedKnown404 = await sw.evaluate(async () => {
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        if (req.url.endsWith('/api/known-404')) return true;
      }
    }
    return false;
  });
  expect(cachedKnown404).toBe(false);
});
```

## Running

### Locally

```bash
npm run build           # produces dist/sw.js with __WB_MANIFEST injected
npx vitest run tests/precache-manifest.spec.ts
npx playwright test tests/workbox-recipes.spec.ts
```

The build step is non-optional — `workbox-precaching` only emits
the precache manifest at build time per [wb-modules]
(`workbox-build` / `workbox-webpack-plugin` / `workbox-cli`).

### In CI

```yaml
jobs:
  workbox-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx vitest run tests/precache-manifest.spec.ts
      - run: npx playwright test tests/workbox-recipes.spec.ts
```

The unit (Vitest) step gates fast; the Playwright recipe step
catches the runtime-only regressions.

## Parsing results

Workbox runtime caches are observable via three surfaces:

| Surface | What it shows | How to read |
|---|---|---|
| `caches.keys()` | All cache namespaces (e.g. `workbox-precache-v2`, `pages`, `images`) | `sw.evaluate(() => caches.keys())` |
| `caches.open(name).keys()` | URLs cached in a namespace | Filter by URL pattern to assert what the recipe captured |
| Playwright `page.on('request')` | Network egress per request | Empty for cache-hit served paths = recipe working |

When an assertion fails on the cache-content surface, also check
the namespace name: Workbox v7 uses `workbox-precache-v2` for
precaching and recipe-default names (`pages`, `images`, `static-resources`,
`google-fonts-stylesheets`, `google-fonts-webfonts`) for recipes
unless overridden via `cacheName` option per [wb-recipes].

## CI integration

For projects that ship Workbox: lock both the precache manifest
*and* one runtime recipe behavior per PR.

```yaml
- name: Workbox unit + e2e
  run: |
    npm run build
    npx vitest run tests/precache-manifest.spec.ts
    npx playwright test tests/workbox-recipes.spec.ts
```

For projects that publish a service worker as part of a release
artifact (separate from app deploy), gate the release on the same
two steps — a Workbox regression that escapes to prod usually
manifests as stale-forever or never-installed, both invisible
without test coverage.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assert recipe behavior only on first page load | Cache is empty; SW hasn't been installed yet | Pre-warm by visiting twice (or use `await page.waitForLoadState('networkidle')`) |
| Assert `caches.keys()` includes a fixed namespace name | Per [wb-recipes], default names can be overridden via `cacheName` | Match by suffix substring (`name.endsWith('-precache-v2')`) |
| Use Vitest with a JSDOM-mocked `caches` for recipe behavior | JSDOM does not implement Cache Storage faithfully; ServiceWorkerRegistration is absent | Use Playwright for runtime recipe assertions (Step 4) |
| Assume `precacheAndRoute(self.__WB_MANIFEST)` works without a bundler | `__WB_MANIFEST` is injected at build time per [wb-modules]; CDN-served `workbox-sw` skips it | If using `workbox-sw` (CDN loader per [wb-modules]), drop the precache assertion |
| Test 60-entry cap by checking `caches.match` returns | `ExpirationPlugin` prunes async; tight `await` returns stale state | Add `await page.waitForTimeout(500)` after the trigger (Step 4 `imageCache()` test) |
| Skip the `workbox-window` event tests entirely | The page-side "update available" UX is built on these events; breaks silently | Step 5 covers the five-event vocabulary |

## Limitations

- **Per-recipe defaults can drift across Workbox majors.** The
  60-image / 30-day / 1-year numbers cited above are the v7.x
  defaults per [wb-recipes]; consult the recipe page at the pinned
  Workbox version before treating the numbers as test invariants.
- **`__WB_MANIFEST` is build-tool-injected.** Tests against the
  static `dist/sw.js` only pass when the bundler ran — local
  `vitest run` against `src/sw.js` will fail to find the array.
- **Cache Storage quota is browser-internal.** Workbox's
  `ExpirationPlugin` `maxEntries` is asserted here; the browser's
  own quota (Step 4 of [`offline-fallback-test`](../offline-fallback-test/SKILL.md))
  is a separate ceiling not testable from `workbox-*` alone.
- **`workbox-window`'s `waiting` event only fires on update.** A
  test that asserts `waiting` on first install will fail by design
  — see [wb-modules] for the per-event firing conditions.
- **CDN-served `workbox-sw`** sidesteps precaching entirely per
  [wb-modules]; this skill's Step 3 assertion does not apply to
  CDN-loader projects.

## References

- Workbox overview ("Production-ready service worker libraries and
  tooling") — [wb-overview].
- Workbox modules (per-package one-line descriptions; the
  `workbox-precaching` / `workbox-window` / `workbox-routing` /
  `workbox-strategies` / `workbox-recipes` family) — [wb-modules].
- Workbox recipes (`pageCache`, `staticResourceCache`, `imageCache`,
  `googleFontsCache`, `offlineFallback`, `warmStrategyCache` with
  defaults) — [wb-recipes].
- Workbox repo (v7.4.1 release, May 2026) — [wb-gh].
- Differentiation:
  [`qa-modern-web/service-worker-tests`](../../../qa-modern-web/skills/service-worker-tests/SKILL.md)
  covers generic `context.serviceWorkers()` Playwright patterns;
  [`qa-modern-web/sw-cache-strategy-author`](../../../qa-modern-web/skills/sw-cache-strategy-author/SKILL.md)
  authors strategies. This skill assumes Workbox was already used
  and tests its specific recipe behavior.
- Sibling skills:
  [`offline-fallback-test`](../offline-fallback-test/SKILL.md),
  [`service-worker-lifecycle-test`](../service-worker-lifecycle-test/SKILL.md),
  [`lighthouse-pwa-audit`](../lighthouse-pwa-audit/SKILL.md).
