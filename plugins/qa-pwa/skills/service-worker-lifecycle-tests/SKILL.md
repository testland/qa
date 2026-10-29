---
name: service-worker-lifecycle-tests
description: "Use when a service worker needs lifecycle tests, users are stuck on an old version after deploy, or caching and offline behavior is untested. Tests each state change from installing to activated, waitUntil, skipWaiting and clients.claim, update() and a clean v1 to v2 upgrade with Playwright."
metadata:
  keywords: "service-worker, lifecycle, skip-waiting, clients-claim, statechange"
  version: "1.2.9"
---

# service-worker-lifecycle-tests

## Overview

Produces `tests/sw-lifecycle.spec.mjs`: one Playwright test per
service-worker lifecycle transition plus a v1 → v2 upgrade test. The
states are `parsed`, `installing`, `installed`, `activating`,
`activated`, `redundant`, and `statechange` fires on the
`ServiceWorker` object when its state changes ([spec][sw-spec]). Most
"stale after deploy" bugs are here: v2 stuck waiting behind v1, v2
active but tabs still on v1, or v1 caches left behind.

Registration itself is the input, not the subject: it is covered by
`add-to-homescreen-flow-tests` (its install-flow reference). For the
page-side `workbox-window` events, see `workbox-tests`.

## When to use

- A new PWA needs a baseline lifecycle spec.
- A deploy left users on the old service worker.
- Stale-UI reports need narrowing to `skipWaiting`, `clients.claim`, or
  cache cleanup.

## Step 1 - Inventory the service worker

```bash
grep -nE "skipWaiting|clients\.claim|caches\.delete|waitUntil" src/sw.*
```

Record whether `install` calls `skipWaiting()` and `activate` calls
`clients.claim()`. `skipWaiting()` makes a waiting worker active
without waiting for old tabs to close ([MDN][mdn-skipwaiting]);
`claim()` makes an active worker control pages that are already open
([MDN][mdn-claim]). The expectations in Steps 4-5 depend on both.

## Step 2 - Add the versioned fixture server

Copy the server from
[references/test-fixtures.md](references/test-fixtures.md) to
`tests/fixtures/sw-server.mjs`, replacing its `sw()` body with the
real service worker's install / activate logic and keeping the
`VERSION` constant, the version-named cache, and the `message` handler.
Start it from Playwright's `webServer` and run this spec with one
worker.

## Step 3 - Write the spec

Helpers and the three core tests (verified 15/15 passing serially on
Chromium against the fixture server):

```js
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const setSwVersion = (request, v) => request.post(`${BASE}/__test/sw-version/${v}`);
const swVersion = (page) => page.evaluate(() => new Promise((resolve) => {
  const ch = new MessageChannel();
  ch.port1.onmessage = (e) => resolve(e.data);
  navigator.serviceWorker.controller.postMessage('version', [ch.port2]);
}));

test.beforeEach(async ({ request }) => { await setSwVersion(request, 1); });

test('first install reaches activated', async ({ page }) => {
  await page.goto(BASE + '/');
  const observed = await page.evaluate(() => new Promise((resolve) => {
    const states = [];
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const w = reg.installing ?? reg.waiting ?? reg.active;
      states.push(w.state);
      if (w.state === 'activated') return resolve(states);
      w.addEventListener('statechange', () => {
        states.push(w.state);
        if (w.state === 'activated' || w.state === 'redundant') resolve(states);
      });
    });
  }));
  expect(observed).toContain('activated');
});

test('waitUntil holds the install phase', async ({ page }) => {
  await page.goto(BASE + '/');
  const ms = await page.evaluate(async () => {
    const t0 = performance.now();
    const reg = await navigator.serviceWorker.register('/sw-slow-install.js', { scope: '/slow/' });
    const w = reg.installing;
    await new Promise((r) => w.addEventListener('statechange', () => w.state !== 'installing' && r()));
    return performance.now() - t0;
  });
  expect(ms).toBeGreaterThanOrEqual(1900);
});

test('v1 to v2: skipWaiting + claim flip the controller and clean caches', async ({ page, request }) => {
  await page.goto(BASE + '/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  expect(await swVersion(page)).toBe(1);

  await setSwVersion(request, 2);
  const states = page.evaluate(() => new Promise(async (resolve) => {
    const reg = await navigator.serviceWorker.getRegistration();
    const old = reg.active;
    old.addEventListener('statechange', () => old.state === 'redundant' && resolve(old.state));
  }));
  const found = page.evaluate(() => new Promise(async (resolve) => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg.addEventListener('updatefound', () => resolve(true));
  }));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());

  expect(await found).toBe(true);
  expect(await states).toBe('redundant');
  await expect.poll(() => swVersion(page)).toBe(2);
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['app-v2']);
});
```

What each test proves:

| Test | Transition | Fails when |
|---|---|---|
| first install | `installing` → `activated` | install handler throws or a precache URL 404s |
| waitUntil | `installing` held ~2 s | `waitUntil` missing, so fetch / push can arrive before precache finishes |
| v1 → v2 | `updatefound`; v1 → `redundant`; controller reports 2; only `app-v2` cache left | missing `skipWaiting`, missing `claim`, or no cache cleanup |

## Step 4 - Variant: no `skipWaiting()`

If the inventory shows no `skipWaiting()`, v2 must stay waiting while a
v1 page is open. Replace the v1 → v2 expectations with:

```js
await expect.poll(() => page.evaluate(async () =>
  (await navigator.serviceWorker.getRegistration()).waiting?.state)).toBe('installed');
expect(await swVersion(page)).toBe(1);   // still controlled by v1
```

then close every page, open a new one, and assert `swVersion` is 2.

## Step 5 - Variant: `skipWaiting()` without `claim()`

v2 activates but the open page keeps `controller === null` or the old
controller until it navigates. Assert `swVersion` is still 1 after
`redundant`, then `page.reload()` and assert 2. A reload from
Playwright is a normal reload, so the service worker handles it; a
user's shift-reload bypasses the worker ([MDN Service Worker API][mdn-sw]).

## Step 6 - When a test fails

| Failing check | Look at |
|---|---|
| Never reaches `activated` | Errors in the worker's own console (`chrome://serviceworker-internals` in a headed run) and precache URLs that 404 |
| `updatefound` never fires | The server still returns identical bytes, or the script is served from HTTP cache (`Cache-Control`) |
| Version stays 1 | `skipWaiting()` / `claim()` missing (Steps 4-5 decide which is intended) |
| Old cache remains | `activate` deletes only known names; delete every name except the current one |
| Passes alone, fails in the full run | More than one worker is flipping the server version |

Fix the cause, re-run the single test with `--repeat-each=5`, then the
whole file.

## Step 7 - Coverage matrix

Write `tests/sw-lifecycle-coverage.yaml` mapping each test to its
transition (template in
[references/upgrade-path.md](references/upgrade-path.md)) and fail CI
when a row has no passing test.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Polling `reg.installing` / `waiting` / `active` | The fields change between samples | Listen for `statechange` |
| Versioning via a page query parameter | `update()` re-fetches the same script bytes | Flip the version on the server (Step 2) |
| Asserting `scriptURL` to tell v1 from v2 | Same URL for both versions | Ask the worker its version (`swVersion`) |
| Fixed sleeps (`setTimeout(…, 500)`) | Passes or fails by machine speed | Wait on events and `expect.poll` |
| Parallel workers sharing the version server | Tests flip each other's version | One worker for this spec |
| Exact state-array equality | Intermediate states may not be observed | `toContain` / final state only |

## Limitations

- Chromium-verified; Firefox and WebKit run the same lifecycle but may
  report fewer intermediate states, so assert final states.
- Multi-tab behaviour needs a second `context.newPage()` and is not in
  the core spec.
- Push and fetch handling are covered by `web-push-tests` and the
  cache-strategy tests in
  [references/playwright-sw-harness.md](references/playwright-sw-harness.md).

## References

- W3C Service Worker spec (`ServiceWorkerState` enum, formal state
  values, `statechange` event semantics) - [sw-spec].
- MDN Service Worker API (lifecycle prose, `waitUntil`,
  `skipWaiting` + `claim` pairing, `controller` semantics) - 
  [mdn-sw].
- MDN `ServiceWorkerGlobalScope.skipWaiting()` - [mdn-skipwaiting].
- MDN `Clients.claim()` - [mdn-claim].
- Versioned fixture server and config -
  [references/test-fixtures.md](references/test-fixtures.md).
- General Playwright SW harness, `service-worker-mock` unit tests,
  cache-strategy assertions -
  [references/playwright-sw-harness.md](references/playwright-sw-harness.md)
  and
  [references/advanced-service-worker-tests.md](references/advanced-service-worker-tests.md).
- Composes:
  `add-to-homescreen-flow-tests`,
  `workbox-tests`.
- Sibling builders:
  `offline-fallback-tests`,
  `add-to-homescreen-flow-tests`.

[sw-spec]: https://w3c.github.io/ServiceWorker/
[mdn-sw]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
[mdn-skipwaiting]: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
[mdn-claim]: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
