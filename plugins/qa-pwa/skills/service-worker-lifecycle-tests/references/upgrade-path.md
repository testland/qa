# Lifecycle coverage matrix and v1 -> v2 upgrade-path spec

Companion detail for `service-worker-lifecycle-tests`. The per-transition test
cells (Steps 2 to 8) are the runnable core and stay in SKILL.md; this file holds
the coverage matrix and the worked upgrade-path spec.

## Coverage matrix

`tests/sw-lifecycle-coverage.yaml` maps each spec to its state-machine cell.
CI gates on every matrix row having at least one passing test.

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

## Worked example: a v1 -> v2 upgrade-path test

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

This single test exercises four state transitions (installed → activating in
v2, activated → redundant in v1) plus the cache-cleanup convention.

Source references:

- sw-spec: https://w3c.github.io/ServiceWorker/
- mdn-sw: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- mdn-skipwaiting: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
- mdn-claim: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
