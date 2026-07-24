---
name: service-worker-lifecycle-tests
description: "Build-an-X workflow that emits per-SW state-transition tests covering the six `ServiceWorkerState` values per [w3c-github-io/ServiceWorker][sw-spec] (`parsed → installing → installed → activating → activated → redundant`), the `install` / `activate` / `fetch` event handlers per [MDN Service Worker API][mdn-sw], `event.waitUntil()` lifetime extension, `ServiceWorkerGlobalScope.skipWaiting()` and `Clients.claim()` upgrade-path semantics, the `statechange` event on `ServiceWorker` objects, `ServiceWorkerRegistration.update()`, and `navigator.serviceWorker.controller` checks. Output: a Playwright spec file with one test per transition plus a clean upgrade-path test (v1 active → v2 installed/waiting → v2 activated, with claim()). Use when authoring the baseline lifecycle spec, or when a deploy leaves users stuck on the old service worker - scoped to the state machine and the `skipWaiting` / `clients.claim` upgrade path, not to general service-worker assertion or cache-strategy patterns."
metadata:
  keywords: "service-worker, lifecycle, skip-waiting, clients-claim, statechange"
---

# service-worker-lifecycle-tests

## Overview

A service worker moves through six formal states per the W3C
spec [sw-spec]: *"`parsed`, `installing`, `installed`, `activating`,
`activated`, `redundant`"*. Most "PWA broke after deploy" bugs are
lifecycle bugs - a v2 SW stuck in `installed` (waiting) behind a v1
that won't release control; a `skipWaiting()` that activates v2 but
leaves v1's caches alive; a `Clients.claim()` race against a hot-
reload that flips the `navigator.serviceWorker.controller`
mid-fetch.

This skill produces the per-extension lifecycle spec - a Playwright
file with one test per transition cell plus a worked v1 → v2
upgrade-path test. It is **distinct from**
`service-worker-tests`,
which covers general `context.serviceWorkers()` Playwright patterns
and per-cache-strategy assertions. This builder is laser-focused on
the state machine.

[sw-spec]: https://w3c.github.io/ServiceWorker/
[mdn-sw]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
[mdn-skipwaiting]: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
[mdn-claim]: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim

Composes with:

- `pwa-install-flow-reference` - the Stage 1 service-worker-registered prerequisite, which
  *this* builder takes as input (assumes registration already
  works).
- `workbox-tests` - the
  `workbox-window` event vocabulary (`installed`, `waiting`,
  `controlling`, `activated`, `redundant`) is the page-side
  observable for the same state machine asserted here from the SW
  side.

## When to use

- New PWA - author the baseline lifecycle spec before the team
  ships any SW logic that mutates state.
- Upgrade-path regression - a deploy left users on v1 because v2's
  `skipWaiting()` was missing; emit the per-transition test cells
  to catch it next time.
- "Stale UI after deploy" reports - the test cells localize
  whether the bug is `skipWaiting`, `Clients.claim`, or cache
  invalidation.
- Migrating from Workbox `workbox-window` to a hand-rolled
  registration helper - assert the same five events still fire.

## Workflow

### Step 1 - Capture the SW under test

Read the SW file the team ships and record three facts:

| Fact | Where to find |
|---|---|
| Registration URL | `<script>` tag or `navigator.serviceWorker.register('/sw.js')` in the page bundle |
| Whether `skipWaiting()` is called in `install` | `self.skipWaiting()` inside an `install` listener |
| Whether `Clients.claim()` is called in `activate` | `self.clients.claim()` inside an `activate` listener |

```bash
# Inventory
grep -E "skipWaiting|clients\.claim" src/sw.ts > sw-lifecycle-inventory.txt
```

Per [mdn-sw]: *"Activation can happen sooner using
`ServiceWorkerGlobalScope.skipWaiting()` and existing pages can be
claimed by the active worker using `Clients.claim()`."* The
combination matters - `skipWaiting` without `claim` activates the
new SW but leaves current tabs uncontrolled until reload.

### Step 2 - Test: state machine entry - fresh install

Per [mdn-sw]: *"The service worker is immediately downloaded when
a user first accesses a service worker - controlled site/page."* The
first-install test:

```ts
import { test, expect } from '@playwright/test';

test('first install transitions parsed → installing → installed → activating → activated', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');

  // Capture statechange events as soon as the SW is reachable
  const observed = await page.evaluate(() => new Promise<string[]>((resolve) => {
    const states: string[] = [];
    navigator.serviceWorker.register('/sw.js').then(reg => {
      const w = reg.installing ?? reg.waiting ?? reg.active;
      if (!w) { resolve(states); return; }
      states.push(w.state);
      w.addEventListener('statechange', () => {
        states.push(w.state);
        if (w.state === 'activated' || w.state === 'redundant') resolve(states);
      });
    });
    // Hard timeout
    setTimeout(() => resolve(states), 10_000);
  }));

  // Per sw-spec, the formal enum is parsed / installing / installed / activating / activated / redundant.
  // Expect at minimum installed and activated in the trace.
  expect(observed).toContain('installed');
  expect(observed).toContain('activated');
});
```

The `statechange` event is fired *"on the corresponding
`ServiceWorker` object"* whenever its `state` attribute changes per
[sw-spec].

### Step 3 - Test: `event.waitUntil` extends the install phase

Per [mdn-sw]: *"Because `install`/`activate` events could take a
while to complete, the service worker spec provides a `waitUntil()`
method. Once it is called on `install` or `activate` events with a
promise, functional events such as `fetch` and `push` will wait
until the promise is successfully resolved."*

```ts
test('SW install with slow precache stays in installing until waitUntil resolves', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');

  const phase = await page.evaluate(() => new Promise<string>((resolve) => {
    navigator.serviceWorker.register('/sw-slow-install.js').then(reg => {
      const w = reg.installing;
      if (!w) { resolve('no installing'); return; }
      // Sample state at ~500ms - the slow install should still be 'installing'
      setTimeout(() => resolve(w.state), 500);
    });
  }));

  expect(['installing', 'installed']).toContain(phase);
});
```

This requires a slow-install SW fixture under `tests/fixtures/sw-slow-install.js`
that calls `event.waitUntil(new Promise(r => setTimeout(r, 2000)))`
inside its `install` handler.

### Step 4 - Test: `skipWaiting()` collapses the waiting phase

Per [mdn-skipwaiting], `skipWaiting()` "causes the waiting service
worker to become the active service worker." Test the transition:

```ts
test('skipWaiting() makes v2 active without page reload', async ({ context, page }) => {
  // Load v1
  await page.goto('https://localhost:3000/?sw-version=1');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  // Deploy v2 (the test server flips the SW response based on a query param header)
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg!.update();
  });

  const waitingThenActive = await page.evaluate(() => new Promise<string>(async (resolve) => {
    const reg = await navigator.serviceWorker.getRegistration();
    // v2 should land in waiting…
    if (reg!.waiting) {
      // …then transition to activating when skipWaiting() fires
      reg!.waiting.addEventListener('statechange', e => {
        resolve((e.target as ServiceWorker).state);
      });
    } else {
      resolve(reg!.active?.state ?? 'unknown');
    }
  }));

  // After skipWaiting(), v2 reaches activated without manual reload
  expect(['activating', 'activated']).toContain(waitingThenActive);
});
```

If the SW under test does *not* call `skipWaiting()`, this test
must assert v2 stays in `installed/waiting` until all v1-controlled
tabs close - flip the expectation accordingly.

### Step 5 - Test: `Clients.claim()` flips the controller

Per [mdn-claim], `Clients.claim()` *"allows an active service
worker to set itself as the controller for all clients within its
scope."*

```ts
test('clients.claim() makes v2 control the page mid-session', async ({ page, context }) => {
  // v1 is active and controlling
  await page.goto('https://localhost:3000/?sw-version=1');
  const v1ScriptURL = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  expect(v1ScriptURL).toMatch(/sw-v1/);

  // Trigger v2 deploy + claim
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg!.update();
  });

  // After claim() in v2's activate handler, controller flips
  const v2ScriptURL = await page.waitForFunction(() => {
    const c = navigator.serviceWorker.controller;
    return c && c.scriptURL.includes('sw-v2') ? c.scriptURL : null;
  });
  expect(await v2ScriptURL.jsonValue()).toMatch(/sw-v2/);
});
```

Per [mdn-sw], the combination of `skipWaiting()` *and* `claim()`
is needed to "force-activate" the new SW; one without the other
leaves a gap.

### Step 6 - Test: old SW transitions to `redundant`

Per [sw-spec], `redundant` is the terminal state - the old SW
enters it when superseded. The transition is the cleanup signal
the `activate` handler typically uses to drop old caches:

```ts
test('old SW transitions to redundant after v2 activates', async ({ context, page }) => {
  await page.goto('https://localhost:3000/?sw-version=1');

  const v1 = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg!.active;
  });

  const finalState = await page.evaluate(() => new Promise<string>(async (resolve) => {
    const reg = await navigator.serviceWorker.getRegistration();
    const oldSW = reg!.active;
    if (!oldSW) { resolve('no old'); return; }
    oldSW.addEventListener('statechange', () => {
      if (oldSW.state === 'redundant') resolve('redundant');
    });
    // Trigger v2 update path
    await reg!.update();
    setTimeout(() => resolve(oldSW.state), 8_000);
  }));

  expect(finalState).toBe('redundant');
});
```

### Step 7 - Test: `navigator.serviceWorker.controller` semantics

Per [mdn-sw], `navigator.serviceWorker.controller` returns the SW
controlling the current page, or `null` if no SW controls it (e.g.
hard-reload, force-bypass, or fresh first load before activation).
Test the boundary cases:

```ts
test('controller is null on first hard-reload, set after activation', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');

  // First load: controller may be null until claim() runs (or until next navigation)
  const initialController = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
  // Either null (no claim) or set (claim called in activate)

  // After a reload, the SW must be controlling
  await page.reload();
  const reloadedController = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  expect(reloadedController).toBeTruthy();
});
```

Per [mdn-sw]: a hard-reload (`Ctrl+Shift+R`) bypasses the SW - 
`controller` is `null` for that page even if an SW is registered.
Playwright's `page.reload({ waitUntil: 'networkidle' })` is a soft
reload; the SW controls it.

### Step 8 - Test: `updatefound` event on registration

Per [mdn-sw], the registration object fires `updatefound` when a
new SW is in the `installing` state. This is the canonical
"deploy detected" event for "Update available" banners:

```ts
test('updatefound fires when a new SW is found', async ({ page, context }) => {
  await page.goto('https://localhost:3000/?sw-version=1');

  const found = await page.evaluate(() => new Promise<boolean>(async (resolve) => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg!.addEventListener('updatefound', () => resolve(true));
    await reg!.update();
    setTimeout(() => resolve(false), 5_000);
  }));

  expect(found).toBe(true);
});
```

### Step 9 - Emit the lifecycle spec artifact

Write `tests/sw-lifecycle.spec.ts` with all eight test cells above.
Pair with a matrix YAML mapping each spec to the state-machine
cell:

```yaml
# tests/sw-lifecycle-coverage.yaml
matrix:
  fresh_install:
    spec: "first install transitions parsed → installing → installed → activating → activated"
    states: [parsed, installing, installed, activating, activated]
    ref: sw-spec ServiceWorkerState enum
  waituntil:
    spec: "SW install with slow precache stays in installing until waitUntil resolves"
    states: [installing]
    ref: mdn-sw waitUntil semantics
  skipwaiting:
    spec: "skipWaiting() makes v2 active without page reload"
    states: [installed, activating, activated]
    ref: mdn-skipwaiting
  claim:
    spec: "clients.claim() makes v2 control the page mid-session"
    states: [activated]
    ref: mdn-claim
  redundant:
    spec: "old SW transitions to redundant after v2 activates"
    states: [redundant]
    ref: sw-spec ServiceWorkerState enum
  controller_semantics:
    spec: "controller is null on first hard-reload, set after activation"
    ref: mdn-sw controller property
  updatefound:
    spec: "updatefound fires when a new SW is found"
    ref: mdn-sw updatefound event
```

CI gates on every matrix row having at least one passing test.

## Worked example: a v1 → v2 upgrade-path test

For an SW that uses `skipWaiting()` + `Clients.claim()`:

```ts
// tests/sw-upgrade-path.spec.ts
import { test, expect } from '@playwright/test';

test('v1 → v2 upgrade: skip waiting + claim, old cache deleted', async ({ page, context }) => {
  // 1. Land on v1 and confirm it controls the page.
  await page.goto('https://localhost:3000/?sw-version=1');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const v1Cache = await page.evaluate(async () => {
    const names = await caches.keys();
    return names.find(n => n.endsWith('-v1'));
  });
  expect(v1Cache).toBeTruthy();

  // 2. Trigger v2 deploy.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg!.update();
  });

  // 3. Wait for the controller to flip to v2 (skipWaiting + claim).
  const v2Controller = await page.waitForFunction(() => {
    const c = navigator.serviceWorker.controller;
    return c && c.scriptURL.endsWith('sw-v2.js') ? c.scriptURL : null;
  }, { timeout: 10_000 });
  expect(await v2Controller.jsonValue()).toMatch(/sw-v2/);

  // 4. Confirm v1 caches are deleted by v2's activate handler.
  const remainingCaches = await page.evaluate(() => caches.keys());
  expect(remainingCaches.some((n: string) => n.endsWith('-v1'))).toBe(false);
  expect(remainingCaches.some((n: string) => n.endsWith('-v2'))).toBe(true);
});
```

This single test exercises four state transitions (installed →
activating in v2, activated → redundant in v1) plus the cache-
cleanup convention. Pair with the per-transition cells from
Steps 2 - 8 for the full lifecycle surface.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Assert state by polling `reg.installing` vs `reg.waiting` vs `reg.active` | Race: the field flips between samples | Listen on `statechange` (Step 2) |
| Skip the `waitUntil` test | Slow installs that block fetch/push are invisible until prod | Step 3 with a fixture SW |
| Test only the `skipWaiting()` half | Without `claim()`, current tabs stay on v1 forever per [mdn-claim] | Step 5 covers the second half |
| Hard-reload between v1 and v2 | Bypasses the SW per [mdn-sw]; loses the lifecycle signal | Use `reg.update()` (Steps 5, 6) |
| Assume `updatefound` fires every navigation | Per [mdn-sw], only when a *new* SW is found | Step 8 explicitly drives `update()` |
| Treat `redundant` as an error | It's the *terminal cleanup* state per [sw-spec] for superseded SWs | Step 6 asserts it as success |
| Skip the per-version cache-cleanup test | A v2 that activates but doesn't delete v1 caches doubles storage | Include in the worked upgrade path test |
| Pin the exact transition ordering | The spec allows intermediate states to be observed or not depending on timing | Assert presence with `toContain`, not exact array equality (Step 2) |

## Limitations

- **`waitUntil` test timing is heuristic.** Step 3 samples at 500ms;
  faster machines may see `installed` already. Use `waitForFunction`
  with a state predicate for production-grade tests.
- **`controller` on first load** can be `null` or set depending on
  whether the SW calls `claim()` per [mdn-sw]; Step 7 covers both
  branches. Tests that hard-pin to one will flake.
- **Cross-tab lifecycle** isn't observed by this builder. Two open
  tabs share the SW registration but each has its own
  `serviceWorker.controller`; a full multi-tab assertion needs a
  second `context.newPage()`.
- **Hard-reload (`Ctrl+Shift+R`) behavior** can't be triggered
  programmatically in Playwright - `page.reload()` is always soft.
  Manual smoke covers this cell.
- **The push and fetch events** that `waitUntil` gates aren't
  tested here directly; pair with
  `web-push-tests` (push side) and
  the `service-worker-tests` cache-strategy tests
  (fetch side).
- **Browser variance.** Firefox and WebKit implement the state
  machine but report `statechange` with slightly different
  intermediate samples per [sw-spec]; the assertions here use
  `toContain` to absorb the variance.

## References

- W3C Service Worker spec (`ServiceWorkerState` enum, formal state
  values, `statechange` event semantics) - [sw-spec].
- MDN Service Worker API (lifecycle prose, `waitUntil`,
  `skipWaiting` + `claim` pairing, `controller` semantics) - 
  [mdn-sw].
- MDN `ServiceWorkerGlobalScope.skipWaiting()` - [mdn-skipwaiting].
- MDN `Clients.claim()` - [mdn-claim].
- Differentiation: `service-worker-tests`
  covers general `context.serviceWorkers()` + cache-strategy
  patterns; this skill is the dedicated state-machine spec
  generator.
- Composes:
  `pwa-install-flow-reference`,
  `workbox-tests`.
- Sibling builders:
  `offline-fallback-tests`,
  `add-to-homescreen-flow-tests`.
