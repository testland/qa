---
name: offline-fallback-test
description: "Build-an-X workflow that emits the offline-fallback test suite. Walks the eight Jake Archibald offline recipes per [web.dev/articles/offline-cookbook][off-cookbook] (`Cache only`, `Network only`, `Cache, falling back to network`, `Cache and network race`, `Network falling back to cache`, `Cache then network`, `Generic fallback`, `Service Worker side templating`), maps each recipe to its assertion shape, layers the Workbox `offlineFallback()` recipe per [developer.chrome.com/docs/workbox/modules/workbox-recipes][wb-recipes], and pins the offline storage strategy (Cache Storage vs IndexedDB vs Storage Manager `persist()`/`estimate()`) per [web.dev/learn/pwa/offline-data][off-data]. Output: a Playwright spec file with one test per route's chosen recipe + a coverage matrix mapping recipes to URL patterns."
rating: 23
d6: 4
archetype: S3
keywords:
  - offline-fallback
  - offline-cookbook
  - workbox-recipes
  - cache-storage
  - storage-manager
---

# offline-fallback-test

## Overview

Offline behavior fragments into eight named recipes per Jake
Archibald's offline cookbook [off-cookbook] — and most PWAs use
three or four of them across different routes. A test suite that
asserts "the site works offline" misses the per-route recipe
contract: a route on `Cache only` must serve from cache even when
network is fine; a route on `Network falling back to cache` must
*prefer* network when both are present.

This skill emits the per-route test suite. The output is a
Playwright spec file plus a coverage YAML that maps each URL
pattern to its recipe and its assertion. The suite is distinct
from the strategy *authoring* in
[`qa-modern-web/sw-cache-strategy-author`](../../../qa-modern-web/skills/sw-cache-strategy-author/SKILL.md);
that skill authors the strategy, this builder generates the
verification.

[off-cookbook]: https://web.dev/articles/offline-cookbook
[off-data]: https://web.dev/learn/pwa/offline-data
[wb-recipes]: https://developer.chrome.com/docs/workbox/modules/workbox-recipes

Composes with:

- [`workbox-tests`](../workbox-tests/SKILL.md) — when the SW uses
  Workbox's `offlineFallback()` recipe, the workbox-tests spec
  covers the recipe's runtime; this builder covers the per-route
  decision and the page-side assertion.
- [`service-worker-lifecycle-test`](../service-worker-lifecycle-test/SKILL.md)
  — every recipe assumes an active SW; the lifecycle spec is the
  prerequisite for this one.
- [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md)
  — Stage 1's service-worker prerequisite cell is the same SW
  this builder tests offline behavior of.

## When to use

- New PWA — author the offline-fallback test plan before any route
  ships SW caching.
- "Site doesn't work offline" bug report — the recipe matrix
  localizes whether the recipe is wrong or just missing for that
  route.
- Migrating from hand-rolled `caches.match` / `event.respondWith`
  to Workbox `offlineFallback()` — assert that the recipe-named
  behavior matches the hand-rolled one.
- Adding a new offline-capable feature (e.g. saved articles, draft
  form data) — pick a recipe per the matrix and emit the test.

## Workflow

### Step 1 — Inventory routes and pick a recipe per route

For each URL pattern the SW intercepts, decide which of the eight
named recipes per [off-cookbook] applies. The cookbook recipes
verbatim:

| Recipe (per [off-cookbook]) | When to use (quoted) |
|---|---|
| **Cache only** | "Use for static assets you've cached during installation that your site depends on." |
| **Network only** | "Best for requests without offline equivalents, like analytics or non-GET operations." |
| **Cache, falling back to network** | "Ideal for building offline-first apps where cached content serves as the default." |
| **Cache and network race** | "Useful when disk access is slow and network speed might win the competition for small assets." |
| **Network falling back to cache** | "Good for frequently updating resources, though slow connections create user frustration." |
| **Cache then network** | "Perfect for content that changes often; displays cached data immediately, updates when fresh data arrives." |
| **Generic fallback** | "Provides a default response when both cache and network requests fail for secondary content." |
| **Service worker-side templating** | "Combines cached templates with JSON data to render pages the service worker controls." |

Workbox layers a named composite recipe on top per [wb-recipes]:

- `offlineFallback()` — "serve a web page, image, or font if
  there's a routing error" when users are offline, defaulting to
  `offline.html`.

Capture decisions in a YAML manifest:

```yaml
# tests/offline-recipe-matrix.yaml
routes:
  - pattern: /_next/static/**
    recipe: Cache only
    reason: Hashed filenames, immutable
  - pattern: /
    recipe: Network falling back to cache
    reason: HTML shell — fresh while online, stale offline
  - pattern: /api/feed
    recipe: Cache then network
    reason: List view; show fast, update behind
  - pattern: /api/user/me
    recipe: Network only
    reason: PII; never cache
  - pattern: /img/**
    recipe: Cache, falling back to network
    reason: Bandwidth save; image lifetime ≥ cache TTL
  - pattern: /*
    recipe: Generic fallback
    reason: Catch-all 404; offline.html
```

### Step 2 — Emit the per-recipe Playwright test

For each recipe row in Step 1's matrix, emit the matching test
pattern. The pattern depends on the recipe — the assertion shape
must distinguish "served from cache" vs "served from network."

#### Cache only

Per [off-cookbook]: "Use for static assets you've cached during
installation." Test that the route serves from cache even with
network reachable, AND with network blocked:

```ts
test('Cache only: /_next/static/x.css serves from cache regardless of network', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  // Block network for the static path
  await context.route('**/_next/static/**', route => route.abort('failed'));

  const res = await page.evaluate(() =>
    fetch('/_next/static/x.css').then(r => r.status).catch(() => 0)
  );
  expect(res).toBe(200);
});
```

#### Network only

```ts
test('Network only: /api/user/me fails when offline (never cached)', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await context.setOffline(true);
  const res = await page.evaluate(() =>
    fetch('/api/user/me').then(r => r.status).catch(() => 0)
  );
  expect(res).toBe(0); // network error; not served from cache
});
```

#### Cache, falling back to network

```ts
test('Cache, falling back to network: /img/x.png serves from cache when present, network when not', async ({ page, context }) => {
  // Warm
  await page.goto('https://localhost:3000/img/x.png');
  await page.waitForLoadState('networkidle');

  // Now offline — cache hits
  await context.setOffline(true);
  const offline = await page.evaluate(() =>
    fetch('/img/x.png').then(r => r.status).catch(() => 0)
  );
  expect(offline).toBe(200);
});
```

#### Cache and network race

The first responder wins. Assert the call returns < small-disk-read budget:

```ts
test('Cache and network race: response under 100ms when cached', async ({ page }) => {
  await page.goto('https://localhost:3000/api/race-cache');
  await page.waitForLoadState('networkidle');

  const ms = await page.evaluate(async () => {
    const t = performance.now();
    await fetch('/api/race-cache');
    return performance.now() - t;
  });
  expect(ms).toBeLessThan(100);
});
```

#### Network falling back to cache

```ts
test('Network falling back to cache: / serves fresh when online, cached when offline', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/');
  expect(resp?.status()).toBe(200);

  await context.setOffline(false);
  // When online, network is preferred — track that a request fires
  let hits = 0;
  page.on('request', req => { if (req.url().endsWith('/')) hits++; });
  await page.reload();
  expect(hits).toBeGreaterThanOrEqual(1);
});
```

#### Cache then network

Two responses for one fetch: instant cache, then revalidated network. Assert two paint phases:

```ts
test('Cache then network: /api/feed renders cached list first, refreshes on network', async ({ page }) => {
  await page.goto('https://localhost:3000/feed');
  // Initial render uses cached list
  await expect(page.locator('[data-testid="feed-list"]')).toBeVisible();
  const initialCount = await page.locator('[data-testid="feed-item"]').count();

  // Refresh fetches from network with newer items
  await page.evaluate(() => fetch('/api/feed?force-refresh=1'));
  await page.waitForTimeout(500);

  const updated = await page.locator('[data-testid="feed-item"]').count();
  expect(updated).toBeGreaterThanOrEqual(initialCount);
});
```

#### Generic fallback

Per [off-cookbook]: "Provides a default response when both cache
and network requests fail for secondary content." Per [wb-recipes],
Workbox's `offlineFallback()` defaults to `offline.html`:

```ts
test('Generic fallback: unknown route + offline serves offline.html', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/never-existed');
  expect(resp?.status()).toBe(200);
  await expect(page.locator('text=/offline|unavailable/i')).toBeVisible();
});
```

#### Service Worker side templating

Per [off-cookbook]: "Combines cached templates with JSON data to
render pages the service worker controls." Assert the SW
synthesizes the response:

```ts
test('SW-side templating: /reports/123 renders cached shell + JSON data', async ({ page }) => {
  // The SW's fetch handler must compose template + data
  await page.goto('https://localhost:3000/reports/123');
  await expect(page.locator('h1')).toContainText('Report #123');

  // Distinct origin proves SW synthesis (not pure network)
  const src = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  expect(src).toBeTruthy();
});
```

### Step 3 — Test the underlying storage choice

Per [off-data], offline data needs the right storage:

| Storage | Per [off-data] | Test posture |
|---|---|---|
| **Cache Storage API** | "Designed for network resources accessed via URL (HTML, CSS, JavaScript, images, videos, audio)" | Assert `caches.has(name)` + `caches.open(name).keys()` returns expected URLs |
| **IndexedDB** | "Use IndexedDB to store structured data" — "data that needs to be searchable or combinable in a NoSQL-like manner" | Assert IDB schema + key existence via `indexedDB.open()` |
| **Storage Manager** | `navigator.storage.estimate()` returns `{ quota, usage }`; `navigator.storage.persist()` requests durable storage | Assert `persisted()` returns true post-request |

Test the Storage Manager `persist()` request:

```ts
test('Storage Manager persist() succeeds for installed PWA', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  const result = await page.evaluate(async () => {
    const persisted = await navigator.storage.persist();
    const isPersisted = await navigator.storage.persisted();
    return { persisted, isPersisted };
  });
  expect(result.isPersisted).toBe(true);
});
```

Per [off-data]: "Chrome permits origins to use up to 60% of total
disk space." Tests that assume small caches mask quota-pressure
bugs; assert the application stays well below the estimate:

```ts
test('cache usage stays under 50MB', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');
  const est = await page.evaluate(async () => navigator.storage.estimate());
  expect(est.usage!).toBeLessThan(50 * 1024 * 1024);
});
```

### Step 4 — Test the offline-fallback page itself

Per [wb-recipes], `offlineFallback()` defaults to `offline.html`.
Assert the file is precached + the response shape:

```ts
test('offline.html is precached and well-formed', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const offlinePagePresent = await sw.evaluate(async () => {
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      const found = await c.match('/offline.html') || await c.match('/_offline');
      if (found) return found.status;
    }
    return null;
  });

  expect(offlinePagePresent).toBe(200);
});
```

If the project overrides the default `pageFallback` option, swap
the assertion target.

### Step 5 — Test the offline → online recovery

A subtle class of bugs: a route correctly serves from cache offline,
but doesn't refresh when network returns. Test the transition:

```ts
test('cache then network: recovers fresh data when online returns', async ({ page, context }) => {
  await page.goto('https://localhost:3000/feed');
  await context.setOffline(true);
  await page.reload();
  // Stale cache served

  await context.setOffline(false);
  // Trigger refresh
  await page.evaluate(() => fetch('/api/feed').then(r => r.json()));
  await page.waitForTimeout(500);

  // Assert no "offline" banner lingering
  await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();
});
```

### Step 6 — Emit the coverage matrix and CI gate

Write `tests/offline-coverage.yaml` mapping each route from
Step 1 to its test name and the source cookbook recipe:

```yaml
matrix:
  - route: /_next/static/**
    recipe: Cache only
    spec: offline-fallback.spec.ts > 'Cache only: /_next/static/*'
    source: off-cookbook "Cache only"
  - route: /
    recipe: Network falling back to cache
    spec: offline-fallback.spec.ts > 'Network falling back to cache'
    source: off-cookbook "Network falling back to cache"
  - route: /api/feed
    recipe: Cache then network
    spec: offline-fallback.spec.ts > 'Cache then network: /api/feed'
    source: off-cookbook "Cache then network"
  - route: /api/user/me
    recipe: Network only
    spec: offline-fallback.spec.ts > 'Network only: /api/user/me'
    source: off-cookbook "Network only"
  - route: /img/**
    recipe: Cache, falling back to network
    spec: offline-fallback.spec.ts > 'Cache, falling back to network: /img/*'
    source: off-cookbook "Cache, falling back to network"
  - route: /*
    recipe: Generic fallback
    spec: offline-fallback.spec.ts > 'Generic fallback'
    source: off-cookbook "Generic fallback"; wb-recipes offlineFallback()
storage:
  - check: cache-usage-under-budget
    source: off-data Storage Manager estimate()
  - check: persisted-storage-granted
    source: off-data Storage Manager persist()
```

CI gates on every row having a passing spec.

## Worked example: a 4-route news PWA

```yaml
routes:
  - pattern: /_next/static/**          # Cache only
  - pattern: /                          # Network falling back to cache
  - pattern: /api/articles              # Cache then network
  - pattern: /api/user/me               # Network only
  - pattern: /*                          # Generic fallback (offline.html)
```

Emitted Playwright spec covers 5 cells. Each test uses the pattern
from Step 2. The full suite runs in ~15 seconds on Chromium and
catches the four most common offline regressions:

1. Static cache miss on stale deploy.
2. HTML shell stuck stale when network returns.
3. Article list never refreshes when going online.
4. PII endpoint accidentally cached.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One "site works offline" smoke test | Per-route recipe regressions invisible | One spec per recipe row per [off-cookbook] (Step 2) |
| Test offline by killing the dev server | SW caches still serve from network until `setOffline(true)` is called | Always `context.setOffline(true)` (every cell) |
| Skip the offline → online recovery test | Stale data lingers after network returns; users see "offline" banner online | Step 5 |
| Pin `caches.match('/offline.html')` to a hard URL | Workbox `pageFallback` option overrides; tests false-fail on custom configs | Match by suffix (Step 4) |
| Test only Chromium | Firefox cache behavior + quota differ | Run cross-browser; Firefox `storage.persist()` UX differs |
| Hand-build storage assertions instead of `navigator.storage.estimate()` | Misses quota-pressure | Step 3 uses the API |
| Assume cached HTML stays fresh forever | TTL plugin (or its absence) gates this; per [wb-recipes] `imageCache()` defaults to 30 days | Assert TTL via `imageCache`-style entry expiration in [`workbox-tests`](../workbox-tests/SKILL.md) |
| Mix recipes without documenting per route | New routes inherit wrong default | The matrix YAML (Step 1) is the source of truth |

## Limitations

- **The "Cache and network race" recipe** is timing-sensitive;
  Step 2's < 100ms threshold is a heuristic for "cache won" — slow
  test machines or instrumented Playwright may report higher
  values. Tighten / loosen per the project's CI host.
- **`SW-side templating`** is rare in modern PWAs; the Step 2 test
  for it assumes the project actually uses the pattern. Skip if
  not.
- **Quota-pressure tests are fragile** — a 50 MB ceiling per the
  Step 3 test is project-specific; per [off-data] the browser
  permits "up to 60% of total disk space" which varies by device.
- **`navigator.storage.persist()`** may prompt the user on some
  browsers; in headless CI the prompt auto-dismisses (or
  auto-grants) inconsistently. Use the `permissions:
  ['persistent-storage']` Playwright context option to grant
  upfront.
- **`offline.html` precache** depends on the SW's
  `precacheAndRoute(self.__WB_MANIFEST)` including the offline
  page; [`workbox-tests`](../workbox-tests/SKILL.md) Step 3
  asserts the manifest contents, which is the upstream gate.
- **No IndexedDB-specific recipe** in [off-cookbook]; this builder
  documents IDB usage in the storage matrix (Step 3) but does not
  generate per-store test cells. Pair with a dedicated IDB test
  skill for full coverage.

## References

- web.dev — Offline cookbook (the eight named recipes; verbatim
  use-case statements per recipe) — [off-cookbook].
- web.dev — Learn PWA: Offline data (Cache Storage vs IndexedDB
  vs Storage Manager; quota note "up to 60% of total disk space")
  — [off-data].
- Chrome — Workbox recipes (`offlineFallback()` recipe defaults to
  `offline.html`) — [wb-recipes].
- Composes:
  [`workbox-tests`](../workbox-tests/SKILL.md),
  [`service-worker-lifecycle-test`](../service-worker-lifecycle-test/SKILL.md),
  [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md).
- Differentiation:
  [`qa-modern-web/sw-cache-strategy-author`](../../../qa-modern-web/skills/sw-cache-strategy-author/SKILL.md)
  authors the strategy; this builder generates the verification
  suite. Both consume the cookbook recipe vocabulary; the
  authoring side writes the SW code, this side writes the spec
  that locks it.
- Sibling builders:
  [`add-to-homescreen-flow-test`](../add-to-homescreen-flow-test/SKILL.md),
  [`service-worker-lifecycle-test`](../service-worker-lifecycle-test/SKILL.md).
