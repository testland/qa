# Advanced service worker tests

Deep reference for `service-worker-lifecycle-tests`. Consult for the
deeper recipes past the persistent-context setup and offline worked
example in [playwright-sw-harness.md](playwright-sw-harness.md):
version-bump cache invalidation, `service-worker-mock` unit tests, and
push-notification subscription tests.

## Version bump + cache invalidation

Assert a v2 worker deletes the v1 caches when it activates:

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

## Unit test the SW with `service-worker-mock`

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

## Push notification subscription test

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

Pair with `web-push-tests` for downstream send/receive assertions.

## References

- [Playwright Chrome extensions docs] - `launchPersistentContext`,
  `context.serviceWorkers()`, `evaluate()`, MV3 lifecycle behavior.

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
