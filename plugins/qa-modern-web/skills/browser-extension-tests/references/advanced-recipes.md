# Advanced browser-extension test recipes

Background-worker, storage, and MV3 lifecycle recipes for
`browser-extension-tests`. Every test below imports the `test` / `expect`
fixtures from `tests/fixtures.ts` (Step 1 of the skill), which supply the
persistent `context` and the resolved `extensionId`.

## Test message passing (popup ↔ background)

```ts
test('popup sends message; background responds', async ({ context, extensionId }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  // Eval in service worker context
  const swReady = await sw.evaluate(() => {
    return new Promise<string>((resolve) => {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        sendResponse({ echo: msg.text });
        return true;
      });
      resolve('ready');
    });
  });
  expect(swReady).toBe('ready');

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  const reply = await popup.evaluate(async () => {
    return chrome.runtime.sendMessage({ text: 'hello' });
  });
  expect(reply).toEqual({ echo: 'hello' });
});
```

## Test `chrome.storage` persistence

```ts
test('storage value persists across popup reload', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await popup.evaluate(async () => {
    await chrome.storage.local.set({ pref: 'dark' });
  });
  await popup.reload();

  const value = await popup.evaluate(async () => {
    const { pref } = await chrome.storage.local.get('pref');
    return pref;
  });
  expect(value).toBe('dark');
});
```

## Survive MV3 service-worker auto-suspend

Per [Playwright Chrome extensions docs]: Chrome auto-suspends MV3
service workers after ~30s of inactivity. Playwright keeps the same
Worker object alive - `evaluate()` calls continue transparently
without requiring new event handlers.

```ts
test('alarm survives service worker restart', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  await sw.evaluate(() => chrome.alarms.create('hourly', { periodInMinutes: 60 }));

  // Simulate idle
  await new Promise(r => setTimeout(r, 35_000));

  // Same sw object; evaluate still works post-restart
  const alarms = await sw.evaluate(() => chrome.alarms.getAll());
  expect(alarms.find((a: any) => a.name === 'hourly')).toBeDefined();
});
```

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
