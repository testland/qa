---
name: workbox-tests
description: "Test Workbox-built service workers - pin behavior of the named recipes (`pageCache`, `staticResourceCache`, `imageCache`, `googleFontsCache`, `offlineFallback`, `warmStrategyCache`) per [developer.chrome.com/docs/workbox/modules/workbox-recipes][wb-recipes]; validate `workbox-precaching` manifest injection (`__WB_MANIFEST` revisioning); assert `workbox-routing` route handler matches; assert `workbox-expiration` and `workbox-cacheable-response` plugin gates; and verify the `workbox-window` registration helper events (`installed`, `waiting`, `controlling`, `activated`). Cache-strategy design (which strategy per route type, TTL + version-bump invalidation, migrating a hand-rolled sw.js to Workbox) lives in references/cache-strategy-design.md. Use when a project ships (or is adopting) a Workbox service worker and its strategy choices or recipe behavior need pinning against refactors or a version upgrade."
metadata:
  keywords: "workbox, workbox-recipes, workbox-window, precaching, service-worker"
---

# workbox-tests

## Overview

This skill tests Workbox-built service workers: assert that an
already-shipped Workbox SW behaves the way its recipes claim, using the
`workbox-precaching` / `workbox-routing` / `workbox-strategies` /
`workbox-recipes` / `workbox-window` packages per
[developer.chrome.com/docs/workbox/modules][wb-modules]. The
design-side counterpart - choosing a strategy per route type and
authoring the Workbox strategy code before pinning it - is in
[references/cache-strategy-design.md](references/cache-strategy-design.md).

[wb-overview]: https://developer.chrome.com/docs/workbox
[wb-modules]: https://developer.chrome.com/docs/workbox/modules
[wb-recipes]: https://developer.chrome.com/docs/workbox/modules/workbox-recipes
[wb-gh]: https://github.com/GoogleChrome/workbox

### Pinned version

Time-sensitive pin - re-check at [wb-gh] on upgrade: Workbox **v7.4.1**
(released May 2026).

## When to use

- A PWA already uses Workbox and tests need to lock its behavior
  against future refactors.
- Migrating from Workbox v6 → v7 - assert each recipe behaves the
  same on the new release.
- A "stale forever" bug report - pin the `workbox-expiration`
  plugin's TTL with a test before patching.
- A `workbox-precaching` injection drifted (build emits wrong
  `__WB_MANIFEST`) - assert the precache manifest shape in CI.

## Choosing a cache strategy

When the SW under test doesn't exist yet, or a hand-rolled `sw.js` is
being migrated to Workbox, start with
[references/cache-strategy-design.md](references/cache-strategy-design.md):
the strategy-per-route-type table (CacheFirst / NetworkFirst /
StaleWhileRevalidate / NetworkOnly), worked Workbox strategy code with
`ExpirationPlugin` + `CacheableResponsePlugin`, the matching Playwright
assertions, an audit table classifying existing hand-rolled fetch
handlers, and invalidation locking (`SW_VERSION` bump + user-opt-in
`skipWaiting`).

## Authoring

### Step 1 - Install test dependencies

Workbox ships no first-party test runner; the canonical pairing is
Playwright (for runtime SW assertions) plus a unit-test runner
(Vitest or Jest) for the `workbox-window` page-side helper:

```bash
npm install --save-dev @playwright/test vitest
# Workbox itself is already a runtime dep at this point
```

### Step 2 - Decide where each assertion lives

| Subject | Runner | Why |
|---|---|---|
| Precache manifest shape (`__WB_MANIFEST`) | Vitest reading the built `sw.js` artifact | Static; no browser needed |
| Recipe behavior at runtime (`pageCache`, `imageCache`) | Playwright | Needs a real `caches` API + fetch interception |
| `workbox-window` events on the page | Playwright (page side) | Listens on `wb.addEventListener(...)` from page code |
| Plugin TTL / quota (`workbox-expiration`) | Playwright with clock manipulation | Needs the SW to actually call the plugin's pruning logic |

### Step 3 - Author the precache-manifest static assertion

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

`precacheAndRoute()` is the entry point exported from `workbox-precaching` per
[wb-modules] - it precaches a file set and manages updates to those files.

### Step 4 - Author per-recipe runtime tests

Each named recipe has a documented default per [wb-recipes]; pin those defaults
with tests. `imageCache()` is a cache-first strategy with defaults of 60 images
cached for 30 days - pin the 60-entry cap:

```ts
import { test, expect } from '@playwright/test';

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

The other five recipe tests - `pageCache()` (network-first, 3s
network-timeout default), `offlineFallback()` (`offline.html` default),
`googleFontsCache()` (30 fonts / 1 year), `staticResourceCache()`
(stale-while-revalidate), and `warmStrategyCache()` (warms declared URLs on
install) - are in [references/recipe-tests.md](references/recipe-tests.md),
each retaining its test-invariant default.

### Step 5 - Author `workbox-window` event tests

`workbox-window` is the page-side companion for registering the SW, managing
updates, and responding to lifecycle events per [wb-modules]. It emits
`installed`, `waiting`, `controlling`, `activated`, and `redundant`. Listen on
each from the page context:

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

### Step 6 - Test the cacheable-response plugin gate

Per [wb-modules], `workbox-cacheable-response` restricts which requests are
cached by response status code or headers. A common config is `statuses: [200]`.
Assert that a 404 is not cached:

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

The build step is non-optional - `workbox-precaching` only emits
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
two steps - a Workbox regression that escapes to prod usually
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
  static `dist/sw.js` only pass when the bundler ran - local
  `vitest run` against `src/sw.js` will fail to find the array.
- **Cache Storage quota is browser-internal.** Workbox's
  `ExpirationPlugin` `maxEntries` is asserted here; the browser's
  own quota (Step 4 of `offline-fallback-tests`)
  is a separate ceiling not testable from `workbox-*` alone.
- **`workbox-window`'s `waiting` event only fires on update.** A
  test that asserts `waiting` on first install will fail by design - see [wb-modules] for the per-event firing conditions.
- **CDN-served `workbox-sw`** sidesteps precaching entirely per
  [wb-modules]; this skill's Step 3 assertion does not apply to
  CDN-loader projects.

## References

- Workbox overview ("Production-ready service worker libraries and
  tooling") - [wb-overview].
- Workbox modules (per-package one-line descriptions; the
  `workbox-precaching` / `workbox-window` / `workbox-routing` /
  `workbox-strategies` / `workbox-recipes` family) - [wb-modules].
- Workbox recipes (`pageCache`, `staticResourceCache`, `imageCache`,
  `googleFontsCache`, `offlineFallback`, `warmStrategyCache` with
  defaults) - [wb-recipes].
- Workbox repo (v7.4.1 release, May 2026) - [wb-gh].
- Strategy design + authoring (per-route strategy table, audit of
  hand-rolled SWs, invalidation locking) -
  [references/cache-strategy-design.md](references/cache-strategy-design.md).
- Generic `context.serviceWorkers()` Playwright patterns - the
  `service-worker-lifecycle-tests` references.
- Sibling skills:
  `offline-fallback-tests`,
  `service-worker-lifecycle-tests`.
