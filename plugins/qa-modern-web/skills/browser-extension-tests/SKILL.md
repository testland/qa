---
name: browser-extension-tests
description: "Test Chromium browser extensions (MV3) with Playwright via `launchPersistentContext` + `--load-extension` / `--disable-extensions-except` flags. Cover service worker, popup pages, content scripts, message passing, and `chrome.runtime` API mocking. Service worker auto-suspends ~30s; Playwright keeps the Worker object alive across restarts."
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - browser-extension
  - chrome-extension
  - manifest-v3
  - playwright
  - service-worker
---

# browser-extension-tests

Per the [Playwright Chrome extensions docs]: load extensions via
`launchPersistentContext` with `--disable-extensions-except` +
`--load-extension` args. *"Google Chrome and Microsoft Edge removed
the command-line flags needed to side-load extensions"* — use the
bundled Chromium browser, not Chrome channel.

## When to use

- Testing a browser extension popup page interaction.
- Validating content-script injection on matching URLs.
- Exercising background service worker (alarms, listeners, message
  routing).
- Verifying `chrome.storage` reads/writes survive reload.

## Step 1 — Test fixture for extension loading

`tests/fixtures.ts`:

```ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const pathToExtension = path.resolve(__dirname, '..', 'dist');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
```

Per [Playwright Chrome extensions docs]. The `extensionId` fixture
extracts the ID from the service worker URL — needed to navigate to
`chrome-extension://${extensionId}/popup.html`.

## Step 2 — Test the popup page

```ts
import { test, expect } from './fixtures';

test('popup renders and increments counter', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.click('[data-testid="increment"]');
  await expect(page.locator('[data-testid="count"]')).toHaveText('1');
});
```

## Step 3 — Test content script injection

```ts
test('content script highlights matched terms', async ({ page }) => {
  await page.goto('https://example.com/');
  // Content script runs at document_idle by default
  await page.waitForFunction(() =>
    document.querySelector('[data-extension-marker]') !== null
  );
  await expect(page.locator('mark[data-extension-marker]')).toHaveCount(3);
});
```

## Step 4 — Test message passing (popup ↔ background)

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

## Step 5 — Test `chrome.storage` persistence

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

## Step 6 — Survive MV3 service-worker auto-suspend

Per [Playwright Chrome extensions docs]: Chrome auto-suspends MV3
service workers after ~30s of inactivity. Playwright keeps the same
Worker object alive — `evaluate()` calls continue transparently
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

## Step 7 — Headless mode

For CI (no display server), use the `chromium` channel + headless
new mode. Per [Playwright Chrome extensions docs], headless support
landed in modern Chromium. Configure:

```ts
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true, // 'new' headless required for extensions
  args: [...]
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `chromium.launch()` (non-persistent) | Extension never loads; persistent context required | Always `launchPersistentContext` (Step 1) |
| Use `chrome` channel | Side-load flags removed in stable Chrome / Edge | Use bundled `chromium` channel (Step 7) |
| Hardcode `extensionId` from local install | ID changes per build / per machine | Extract from SW URL (Step 1 fixture) |
| Test in MV2 mode | Deprecated; production extensions are MV3 | Always test against the manifest version you ship |
| Skip waitForEvent('serviceworker') | Race: SW not yet registered | Always await the event (Step 1) |

## Limitations

- Playwright Chrome extension support targets Chromium; Firefox WebExtensions
  use a different test approach (see Mozilla's `web-ext` tooling).
- Some extension APIs (`chrome.declarativeNetRequest`) cannot be
  fully unit-tested without a browser; integration tests are required.
- Auto-suspend timing varies by Chromium version — verify against
  the [Playwright Chrome extensions docs].

## References

- [Playwright Chrome extensions docs] — fixture pattern, service
  worker access, MV3 auto-suspend behavior

[Playwright Chrome extensions docs]: https://playwright.dev/docs/chrome-extensions
